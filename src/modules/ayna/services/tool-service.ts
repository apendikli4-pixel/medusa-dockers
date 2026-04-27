import { Logger, RemoteQueryFunction } from "@medusajs/framework/types"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { AI_CONFIG } from "../../../lib/ai-config"
import AynaMemoryService from "./memory-service"
import AynaDiagnosticService from "./diagnostic-service"
import AynaStockIntelligenceService from "./stock-intelligence-service"

type InjectedDependencies = {
    logger: Logger
    aynaMemoryService: AynaMemoryService
    aynaDiagnosticService: AynaDiagnosticService
    aynaStockIntelligenceService: AynaStockIntelligenceService
}

export default class AynaToolService {
    protected logger_: Logger
    protected memoryService_: AynaMemoryService
    protected diagnosticService_: AynaDiagnosticService
    protected stockIntelligenceService_: AynaStockIntelligenceService
    protected genAI_: GoogleGenerativeAI | null = null

    constructor({ logger, aynaMemoryService, aynaDiagnosticService, aynaStockIntelligenceService }: InjectedDependencies) {
        this.logger_ = logger
        this.memoryService_ = aynaMemoryService
        this.diagnosticService_ = aynaDiagnosticService
        this.stockIntelligenceService_ = aynaStockIntelligenceService
        const apiKey = process.env.GEMINI_API_KEY
        if (apiKey) {
            this.genAI_ = new GoogleGenerativeAI(apiKey)
        }
    }

    async handleToolCall(
        toolName: string,
        args: Record<string, any>,
        services?: {
            productModuleService?: any
            inventoryService?: any
            stockLocationService?: any
            pricingModuleService?: any
            salesChannelModuleService?: any
            contentEngineService?: any
            remoteQuery?: RemoteQueryFunction
            isAdmin?: boolean
        }
    ): Promise<any> {
        this.logger_.info(`[AynaTool] Executing tool: ${toolName}`)
        
        switch (toolName) {
            case "search_products":
                return await this.executeProductSearch(args, services?.productModuleService, services?.remoteQuery)
            case "check_inventory":
                return await this.executeInventoryCheck(args, services?.inventoryService, services?.remoteQuery)
            case "calculatePoolChemicals":
                return this.executePoolCalculation(args)
            case "conscience_check":
                return await this.executeConscienceCheck(args)
            case "system_audit":
                if (!services?.isAdmin) return { error: "Bu araç yalnızca admin kullanıcıları tarafından kullanılabilir." }
                if (!services?.remoteQuery) return { error: "Query service unavailable" }
                return await this.diagnosticService_.runFullAudit(services.remoteQuery)
            case "system_auto_fix":
                if (!services?.isAdmin) return { error: "Bu araç yalnızca admin kullanıcıları tarafından kullanılabilir." }
                return await this.diagnosticService_.runAutoFix()
            case "predict_stock_shortage":
                if (!services?.isAdmin) return { error: "Bu araç yalnızca admin kullanıcıları tarafından kullanılabilir." }
                if (!services?.remoteQuery) return { error: "Query service unavailable" }
                return await this.stockIntelligenceService_.predictStockShortages(services.remoteQuery, args.daysThreshold || 7)
            default:
                return { error: `Unknown tool: ${toolName}` }
        }
    }

    private async executeProductSearch(
        args: Record<string, any>,
        productModuleService?: any,
        remoteQuery?: RemoteQueryFunction
    ) {
        try {
            if (productModuleService) {
                const products = await productModuleService.listProducts(
                    { q: args.query },
                    { take: args.limit || 5, select: ["id", "title", "handle", "status"] }
                )
                await this.memoryService_.recordTruth("system", "product_search", { query: args.query, resultCount: products.length })
                return { products, count: products.length }
            }
            // RemoteQuery fallback
            if (remoteQuery) {
                const filters = args.query ? { title: { $ilike: `%${args.query}%` } } : undefined
                const { data: products } = await remoteQuery.graph({
                    entity: "product",
                    fields: ["id", "title", "handle", "status"],
                    filters,
                    pagination: { take: args.limit || 5 }
                })
                return { products: products || [], count: products?.length || 0 }
            }
            return { error: "Product service unavailable" }
        } catch (e: any) {
            return { error: e.message }
        }
    }

    private async executeInventoryCheck(
        args: Record<string, any>,
        inventoryService?: any,
        remoteQuery?: RemoteQueryFunction
    ) {
        try {
            if (inventoryService) {
                const items = await inventoryService.listInventoryItems({ sku: args.productId })
                return { items, available: items.length > 0 }
            }
            return { error: "Inventory service unavailable" }
        } catch (e: any) {
            return { error: e.message }
        }
    }

    private executePoolCalculation(args: Record<string, any>) {
        let volume = args.volume
        if (!volume && args.length && args.width && args.depth) {
            volume = args.length * args.width * args.depth
        }
        if (!volume) return { error: "Volume required" }

        const weeklyChlorKg = volume * 0.2
        return {
            volume_m3: volume,
            chlorine_kg: (volume * 0.001).toFixed(2),
            weekly_estimate: weeklyChlorKg.toFixed(2),
            recommendation: "Standard maintenance dose calculated."
        }
    }

    private async executeConscienceCheck(args: Record<string, any>) {
        if (!this.genAI_) return { verdict: "DENY", reasoning: "AI unavailable" }
        
        try {
            const model = this.genAI_.getGenerativeModel({
                model: AI_CONFIG.geminiModel,
                systemInstruction: "You are an ethical auditor for e-commerce. Response in JSON: {\"verdict\": \"ALLOW\"/\"DENY\", \"reasoning\": \"...\"}"
            })
            const prompt = `Action: ${args.action}\nContext: ${args.context}`
            const result = await model.generateContent(prompt)
            const text = result.response.text().replace(/```json|```/g, "").trim()
            const parsed = JSON.parse(text)

            await this.memoryService_.recordTruth("system", `conscience_${parsed.verdict.toLowerCase()}`, {
                action: args.action,
                reasoning: parsed.reasoning
            })

            return parsed
        } catch (e) {
            return { verdict: "DENY", reasoning: "Audit failed, safe-deny applied." }
        }
    }
}
