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

type InjectedDependencies = {
    logger: Logger
    aynaMemoryService: AynaMemoryService
    aynaToolService: AynaToolService
    aynaChatService: AynaChatService
    aynaDiagnosticService: AynaDiagnosticService
    aynaStockIntelligenceService: AynaStockIntelligenceService
    hybridAIProvider: HybridAIProviderService
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
        this.memoryService_ = container.aynaMemoryService
        this.toolService_ = container.aynaToolService
        this.chatService_ = container.aynaChatService
        this.diagnosticService_ = container.aynaDiagnosticService
        this.stockIntelligenceService_ = container.aynaStockIntelligenceService
        this.hybridAIProvider_ = container.hybridAIProvider
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
}



