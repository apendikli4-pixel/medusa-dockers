import { MedusaService } from "@medusajs/framework/utils"
import { Logger, Context } from "@medusajs/framework/types"
import { ollamaGenerate } from "../../../lib/ollama-client"
import { MemoryTruth, MemoryInsight, MemoryConscience } from "../models/memory"

type InjectedDependencies = {
    logger: Logger
    [key: string]: unknown
}

export default class AynaMemoryService extends MedusaService({
    MemoryTruth,
    MemoryInsight,
    MemoryConscience,
}) {
    protected logger_: Logger

    constructor(container: InjectedDependencies) {
        super(container)
        this.logger_ = container.logger
    }

    /**
     * Dürüstlük kaydı — recordTruth
     * Her tool call ve önemli olay buraya kaydedilir
     */
    async recordTruth(
        actor: string,
        action: string,
        data: Record<string, any>,
        sharedContext?: Context
    ): Promise<any> {
        try {
            // @ts-ignore MedusaService methods are dynamically generated
            return await this.createMemoryTruths({
                entity_id: actor,
                content: `[${action}] ${JSON.stringify(data)}`,
                importance: action === "conscience_deny" ? 10 : 5,
                metadata: { actor, action, ...data, timestamp: new Date().toISOString() }
            }, sharedContext)
        } catch (e: any) {
            this.logger_.error(`[AynaMemory] recordTruth error: ${e.message}`)
            return null
        }
    }

    /**
     * Kullanıcı öğrenme kaydı — storeInsight
     */
    async storeInsight(
        entityId: string,
        key: string,
        value: string,
        sharedContext?: Context
    ): Promise<any> {
        try {
            // @ts-ignore
            const result = await this.createMemoryInsights({
                entity_id: entityId,
                content: `${key}: ${value}`,
                metadata: { key, value, timestamp: new Date().toISOString() }
            }, sharedContext)

            // Otomatik hafıza bakımı — 10 insight geçince özet çıkar
            await this.maintainMemory(entityId, sharedContext)

            return result
        } catch (e: any) {
            this.logger_.error(`[AynaMemory] storeInsight error: ${e.message}`)
            return null
        }
    }

    /**
     * Hafıza bakımı — 10+ insight olunca özetler
     */
    async maintainMemory(entityId: string, sharedContext?: Context) {
        try {
            // @ts-ignore
            const insights = await this.listMemoryInsights({
                    entity_id: entityId,
                    is_archived: false
            }, undefined, sharedContext)

            if (!insights || insights.length < 10) return

            const prompt = `Aşağıdaki müşteri bilgilerini ve etkileşimleri analiz ederek kısa bir özet çıkar:\n${insights.map((i: any) => i.content).join("\n")}`
            const summary = (await ollamaGenerate(prompt, { temperature: 0.3, maxTokens: 500 })).trim()

            // Yeni özet insight olarak ekle
            // @ts-ignore
            await this.createMemoryInsights({
                entity_id: entityId,
                content: `ÖZET HAFIZA: ${summary}`,
                metadata: { type: "summary" }
            }, sharedContext)

            // Eskileri arşivle
            const idsToArchive = insights.map((i: any) => i.id)
            // @ts-ignore
            await this.updateMemoryInsights({
                selector: { id: idsToArchive },
                data: { is_archived: true }
            }, sharedContext)

            this.logger_.info(`[AynaMemory] Memory maintenance completed for ${entityId}`)
        } catch (e: any) {
            this.logger_.error(`[AynaMemory] Memory maintenance error: ${e.message}`)
        }
    }
}
