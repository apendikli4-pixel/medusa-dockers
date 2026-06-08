import { MedusaService } from "@medusajs/framework/utils"
import { Logger, IModuleService, Context, RemoteQueryFunction } from "@medusajs/framework/types"
import { MemoryTruth, MemoryInsight, MemoryConscience } from "./models/memory"
import { Mission } from "./models/mission"

import AynaMemoryService from "./services/memory-service"
import AynaToolService from "./services/tool-service"
import AynaChatService from "./services/chat-service"
import AynaDiagnosticService from "./services/diagnostic-service"
import AynaStockIntelligenceService from "./services/stock-intelligence-service"
import HybridAIProviderService from "./services/hybrid-ai.provider"
import InjectionDetectorService from "../conscience/services/injection-detector.service"

type InjectedDependencies = {
    logger: Logger
}

export default class AynaService extends MedusaService({
    MemoryTruth,
    MemoryInsight,
    MemoryConscience,
    Mission,
}) {
    static identifier = "ayna"
    protected logger_: Logger
    protected memoryService_: AynaMemoryService
    protected toolService_: AynaToolService
    protected chatService_: AynaChatService
    protected diagnosticService_: AynaDiagnosticService
    protected stockIntelligenceService_: AynaStockIntelligenceService
    protected hybridAIProvider_: HybridAIProviderService

    constructor(container: InjectedDependencies) {
        super(container)
        this.logger_ = container.logger

        // Medusa V2 modül container'ı sub-service'leri auto-discover etmiyor.
        // Bu yüzden alt servisleri burada manuel instantiate ediyoruz.
        this.hybridAIProvider_ = new HybridAIProviderService(container.logger)
        this.memoryService_ = new AynaMemoryService({
            logger: container.logger,
        } as ConstructorParameters<typeof AynaMemoryService>[0])
        this.diagnosticService_ = new AynaDiagnosticService({ logger: container.logger })
        this.stockIntelligenceService_ = new AynaStockIntelligenceService({ logger: container.logger })
        this.toolService_ = new AynaToolService({
            logger: container.logger,
            aynaMemoryService: this.memoryService_,
            aynaDiagnosticService: this.diagnosticService_,
            aynaStockIntelligenceService: this.stockIntelligenceService_,
            aynaService: this,
        })
        const injectionDetector = new InjectionDetectorService({ logger: container.logger })
        this.chatService_ = new AynaChatService({
            logger: container.logger,
            aynaMemoryService: this.memoryService_,
            aynaToolService: this.toolService_,
            hybridAIProvider: this.hybridAIProvider_,
            injectionDetectorService: injectionDetector,
        })
    }

    /**
     * Ana mesaj işleme — Alt servise delege edildi
     */
    async processMessage(
        message: string,
        options?: any
    ): Promise<{ response: string; debug: any }> {
        return await this.chatService_.processMessage(message, options || {})
    }

    /**
     * Blog/SEO içerik üretimi — chat akışından bağımsız, doğrudan AI provider.
     *
     * processMessage chat odaklıdır (guardian prompt, tool çağrıları, hafıza);
     * blog için bunlara gerek yok. Bu metod düşük temperature (tutarlı, az
     * halüsinasyon) + yüksek token limiti ile temiz uzun-form içerik üretir.
     *
     * @returns üretilen markdown metni (boşsa hata fırlatır)
     */
    async generateBlogContent(
        prompt: string,
        opts?: { temperature?: number; maxTokens?: number }
    ): Promise<string> {
        const res = await this.hybridAIProvider_.generateText(prompt, {
            temperature: opts?.temperature ?? 0.4,
            maxTokens: opts?.maxTokens ?? 1200,
        })
        const text = (res?.text || "").trim()
        if (!text) {
            throw new Error("AI boş içerik döndürdü")
        }
        return text
    }

    /**
     * Dürüstlük kaydı — Alt servise delege edildi
     */
    async recordTruth(actor: string, action: string, data: any): Promise<any> {
        return await this.memoryService_.recordTruth(actor, action, data)
    }

    /**
     * Hafıza kaydı — Alt servise delege edildi
     */
    async storeInsight(entityId: string, key: string, value: string): Promise<any> {
        return await this.memoryService_.storeInsight(entityId, key, value)
    }

    /**
     * Misyon çalıştırma - AynaToolService'e delege edildi
     */
    async executeMission(missionId: string, options?: any) {
        const missions = await this.listMissions({ id: missionId })
        const mission = (missions as any[])?.[0]
        if (!mission) {
            throw new Error(`Mission bulunamadı: ${missionId}`)
        }

        const updated = await this.updateMissions({
            selector: { id: missionId },
            data: { status: "completed" },
        })

        await this.memoryService_.recordTruth("system", "mission_executed", {
            missionId,
            title: mission.title,
            description: mission.description,
        })

        return Array.isArray(updated) ? updated[0] : updated
    }

    // Missions metotları MedusaService tarafından otomatik oluşturulur (inherited)

    /**
     * Generative UI konfigürasyonu üretir.
     */
    async generateGenerativeUI(customerId?: string): Promise<any> {
        let insights: any[] = []
        if (customerId) {
            // @ts-ignore - memoryService listMemoryInsights metoduna sahip
            insights = await this.memoryService_.listMemoryInsights({
                filters: { entity_id: customerId, is_archived: false },
                take: 5
            })
        }

        const prompt = `Sen e-ticaret sitenin "Generative UI" mimarısısın. Müşterinin site ana sayfasına girdiği anda onun profiline özel UI (Arayüz) elementleri belirleyeceksin.
Müşteri Bilgisi: ${insights.length > 0 ? insights.map((i: any) => i.content).join("; ") : "Anonim ziyaretçi."}

Görev: Bu müşteri için en uygun Hero banner başlığını, alt başlığını ve hangi ürünleri listelemek gerektiğini (arama terimi olarak) belirle.
Eğer müşteri anonimse veya spesifik bir verisi yoksa genel geçer, yüksek dönüşümlü (premium) bir ana sayfa kurgusu ver.

Lütfen çıktıyı sadece JSON olarak ver, açıklamalar ekleme.`

        const schema = {
            type: "object",
            properties: {
                heroTitle: { type: "string" },
                heroTagline: { type: "string" },
                recommendedSearchQuery: { type: "string" },
                themeMode: { type: "string", enum: ["light", "dark", "premium"] }
            },
            required: ["heroTitle", "heroTagline", "recommendedSearchQuery", "themeMode"]
        }

        try {
            const aiResponse = await this.hybridAIProvider_.generateStructured(prompt, { schema })
            // LLM, JSON'ı Markdown formatında (` ```json ... ``` `) dönebilir
            let textResponse = aiResponse.text.trim()
            if (textResponse.startsWith("```json")) {
                textResponse = textResponse.replace(/```json/g, "").replace(/```/g, "").trim()
            }
            if (textResponse.startsWith("```")) {
                textResponse = textResponse.replace(/```/g, "").trim()
            }
            return JSON.parse(textResponse)
        } catch (error) {
            this.logger_.error(`[GenerativeUI] Error generating UI: ${error}`)
            // Fallback default UI
            return {
                heroTitle: "Ayna Genesis",
                heroTagline: "Dürüstlük odaklı e-ticaret — yapay zeka asistanlı, çok mağazalı.",
                recommendedSearchQuery: "",
                themeMode: "premium"
            }
        }
    }
}



