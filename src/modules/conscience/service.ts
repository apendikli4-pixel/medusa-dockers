import { MedusaService } from "@medusajs/framework/utils"
import { ConscienceSettings, ConscienceLog } from "./models/conscience"
import {
    Logger,
} from "@medusajs/framework/types"
import { BigNumber } from "@medusajs/framework/utils"

import { ollamaGenerate } from "../../lib/ollama-client"

type InjectedDependencies = {
    logger: Logger
}

interface ConscienceServiceMethods {
    listConscienceSettings(filters?: any, config?: any): Promise<any[]>
    createConscienceLogs(data: any): Promise<any>
    updateConscienceSettings(data: any): Promise<any>
}

export default class ConscienceService extends MedusaService({
    ConscienceSettings,
    ConscienceLog,
}) implements ConscienceServiceMethods {
    static identifier = "conscience"
    protected logger_: Logger
    protected aiEnabled_: boolean = true
    protected injectionDetectionEnabled: boolean = true
    protected injectionRiskThreshold: number = 70
    protected injectionBlockList: string[] = []
    protected injectionAllowList: string[] = []

    // MedusaService tarafından oluşturulan metodlar
    declare listConscienceSettings: ConscienceServiceMethods["listConscienceSettings"]
    declare createConscienceLogs: ConscienceServiceMethods["createConscienceLogs"]
    declare updateConscienceSettings: ConscienceServiceMethods["updateConscienceSettings"]

    constructor(container: InjectedDependencies, options: any = {}) {
        super(container)
        this.logger_ = container.logger

        // Configure injection detection from options
        if (options.injectionDetection) {
            this.injectionDetectionEnabled = options.injectionDetection.enabled !== false;
            this.injectionRiskThreshold = options.injectionDetection.riskThreshold || 70;
            this.injectionBlockList = options.injectionDetection.blockList || [];
            this.injectionAllowList = options.injectionDetection.allowList || [];
        }

        // AI (Ollama) self-hosted — her zaman etkin kabul edilir.
        this.aiEnabled_ = true
    }

    /**
     * Bütçe kontrolü yapar ve gerekirse uyarı logu oluşturur.
     */
    async checkBudgetCompliance(
        customerId: string,
        currentCartTotal: number,
        currencyCode: string
    ): Promise<{
        isCompliant: boolean;
        warning?: string;
        suggestedLimit?: number;
    }> {
        const settings = await this.listConscienceSettings({
            customer_id: customerId
        })

        const setting = settings?.[0]

        if (!setting || !setting.is_active) {
            return { isCompliant: true }
        }

        const monthlyLimit = setting.monthly_limit || 0
        const currentSpending = setting.current_spending || 0
        const cartValue = currentCartTotal

        const totalProjected = Number(currentSpending) + Number(cartValue)

        // Bütçe aşımı kontrolü
        if (totalProjected > Number(monthlyLimit)) {
            const overAmount = totalProjected - Number(monthlyLimit)

            // Log oluştur
            await this.createConscienceLogs({
                customer_id: customerId,
                level: "warning",
                message: `Bütçe aşımı uyarısı: ${overAmount} ${currencyCode} fazla harcama planlanıyor.`,
                metadata: {
                    limit: monthlyLimit.toString(),
                    projected: totalProjected.toString(),
                    cart: cartValue.toString()
                }
            })

            return {
                isCompliant: false,
                warning: `Bu alışverişle aylık bütçenizi ${overAmount} ${currencyCode} aşıyorsunuz. Ayna sizin için dürüstlüğü önemsiyor.`,
                suggestedLimit: Number(monthlyLimit)
            }
        }

        return { isCompliant: true }
    }

    /**
     * Alışveriş sonrası harcama miktarını günceller.
     */
    async updateSpendingRecord(customerId: string, amount: number) {
        const settings = await this.listConscienceSettings({
            customer_id: customerId
        })

        const setting = settings?.[0]

        if (setting) {
            const current = setting.current_spending || 0
            const newTotal = Number(current) + Number(amount)

            await this.updateConscienceSettings({
                id: setting.id,
                current_spending: newTotal
            })

            this.logger_.info(`[Conscience] Updated spending for ${customerId}: +${amount}`)
        }
    }

    /**
     * Etik değerlendirme — Dokümandaki evaluate()
     * Bir işlemin etik uygunluğunu değerlendirir
     * @returns { verdict: "ALLOW" | "DENY", reasoning: string }
     */
    async evaluate(params: {
        proposed_action: string
        context: Record<string, any>
    }): Promise<{ verdict: "ALLOW" | "DENY"; reasoning: string }> {
        const { proposed_action, context } = params

        // 1. Statik kurallar (Hızlı Denetim)
        const denyRules = [
            {
                check: () => context.stock !== undefined && context.stock <= 0,
                reasoning: "Stokta olmayan ürün önerilemez. Dürüstlük prensibi ihlal edilir."
            },
            {
                check: () => proposed_action.toLowerCase().includes("fiyat manipülasyonu"),
                reasoning: "Fiyat manipülasyonu etik değildir."
            }
        ]

        for (const rule of denyRules) {
            if (rule.check()) {
                await this.logVerdict("DENY", proposed_action, rule.reasoning, context)
                return { verdict: "DENY", reasoning: rule.reasoning }
            }
        }

        // 2. AI Tabanlı Etik Değerlendirme (Derin Analiz) — Ollama
        if (this.aiEnabled_) {
            try {
                const prompt = `
                    Bir e-ticaret asistanının yapmak istediği şu eylemi etik ve dürüstlük açısından değerlendir:
                    Eylem: "${proposed_action}"
                    Bağlam: ${JSON.stringify(context)}

                    Yanıtını SADECE şu JSON formatında ver:
                    { "verdict": "ALLOW" | "DENY", "reasoning": "kısa gerekçe" }
                `
                const raw = await ollamaGenerate(prompt, { temperature: 0.2, json: true })
                const response = JSON.parse(raw.trim().replace(/```json|```/g, ""))

                await this.logVerdict(response.verdict, proposed_action, response.reasoning, context)
                return response
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : "Unknown error"
                this.logger_.error(`[Conscience] AI evaluation failed: ${message}`)
            }
        }

        // 3. Varsayılan (AI yoksa veya çökerse)
        await this.logVerdict("ALLOW", proposed_action, "Standart kurallara uygun.", context)
        return {
            verdict: "ALLOW",
            reasoning: `"${proposed_action}" eylemi standart etik filtreden geçti.`
        }
    }

    private async logVerdict(verdict: string, action: string, reasoning: string, context: any) {
        await this.createConscienceLogs({
            customer_id: context.customerId || "system",
            level: verdict === "DENY" ? "critical" : "info",
            message: `${verdict}: ${action} — ${reasoning}`,
            metadata: { verdict, action, reasoning, context }
        })
        if (verdict === "DENY") {
            this.logger_.warn(`[Conscience] DENY: ${action} - ${reasoning}`)
        }
    }
}
