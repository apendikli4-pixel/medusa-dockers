import { Logger, RemoteQueryFunction, Context } from "@medusajs/framework/types"
import { AI_CONFIG } from "../../../lib/ai-config"
import { GUARDIAN_SYSTEM_PROMPT, ADMIN_SYSTEM_PROMPT } from "../prompts/guardian-prompt"
import AynaMemoryService from "./memory-service"
import AynaToolService from "./tool-service"
import { HybridAIProviderService } from "./hybrid-ai.provider"
import { SemanticCacheService, CacheType } from "../../../lib/cache/semantic-cache.service"
// Import injection detector service
import InjectionDetectorService from "../../../modules/conscience/services/injection-detector.service"

import { volumeCalculatorTool } from "../tools/volume-calculator-tool"
import { productSearchTool } from "../tools/product-tool"
import { inventoryCheckTool } from "../tools/inventory-tool"
import { conscienceTool } from "../tools/conscience-tool"
import { poolCalculatorTool } from "../tools/pool-calculator-tool"
import { campaignTool } from "../tools/campaign-tool"
import { categoryTool } from "../tools/category-tool"
import { contentCreatorTool } from "../tools/content-creator-tool"
import { inventoryManagerTool } from "../tools/inventory-manager-tool"
import { quickOrderTool } from "../tools/order-tool"
import { productCreateTool } from "../tools/product-create-tool"
import { storeGeneratorTool } from "../tools/store-generator-tool"
import { vapeCalculatorTool } from "../tools/vape-calculator-tool"
import { sizeGuideTool } from "../tools/size-guide-tool"
import { deviceCompatibilityTool } from "../tools/device-compatibility-tool"
import { villaSearchTool } from "../tools/villa-search-tool"
import { createMissionTool } from "../tools/create_mission"
import { analyzeTrafficTool } from "../tools/analyze_traffic"

// Statik diziler kaldırıldı. Dinamik oluşturucu fonksiyon:
function getToolsForSector(sector: string, isAdmin: boolean) {
    const baseStoreTools = [productSearchTool, inventoryCheckTool, conscienceTool]
    let sectorTools: any[] = []

    switch (sector.toLowerCase()) {
        case "pool":
            sectorTools = [poolCalculatorTool, volumeCalculatorTool]
            break
        case "vape":
            sectorTools = [vapeCalculatorTool]
            break
        case "retail":
        case "universal":
        case "b2b":
            sectorTools = [volumeCalculatorTool]
            break
        case "fashion":
            sectorTools = [sizeGuideTool]
            break
        case "electronics":
            sectorTools = [deviceCompatibilityTool]
            break
        case "villa":
            sectorTools = [villaSearchTool]
            break
        default:
            break
    }

    const storeTools = [...baseStoreTools, ...sectorTools]

    if (isAdmin) {
        return [
            ...storeTools,
            campaignTool,
            categoryTool,
            contentCreatorTool,
            inventoryManagerTool,
            quickOrderTool,
            productCreateTool,
            storeGeneratorTool,
            createMissionTool
        ]
    }
    
    return storeTools
}

type InjectedDependencies = {
    logger: Logger
    aynaMemoryService: AynaMemoryService
    aynaToolService: AynaToolService
    hybridAIProvider: HybridAIProviderService
    injectionDetectorService: InjectionDetectorService
}

export default class AynaChatService {
    protected logger_: Logger
    protected memoryService_: AynaMemoryService
    protected toolService_: AynaToolService
    protected hybridAIProvider_: HybridAIProviderService
    protected injectionDetectorService_: InjectionDetectorService
    protected semanticCache_: SemanticCacheService

    constructor({ logger, aynaMemoryService, aynaToolService, hybridAIProvider, injectionDetectorService }: InjectedDependencies) {
        this.logger_ = logger
        this.memoryService_ = aynaMemoryService
        this.toolService_ = aynaToolService
        this.hybridAIProvider_ = hybridAIProvider
        this.injectionDetectorService_ = injectionDetectorService
        this.semanticCache_ = SemanticCacheService.getInstance()
    }

    async processMessage(
        message: string,
        options: {
            customerId?: string
            customerGroup?: string
            image?: string
            isAdmin?: boolean
            context?: Context
            remoteQuery?: RemoteQueryFunction
            [key: string]: any
        }
    ): Promise<{ response: string; debug: any }> {
        // Check for prompt injection attempts
        const injectionResult = this.injectionDetectorService_.detect(message);
        if (injectionResult.isMalicious) {
            this.logger_.warn(`[AynaChat] Blocked prompt injection attempt from customer ${options.customerId || "anonymous"}`, {
                riskScore: injectionResult.riskScore,
                detectedPatterns: injectionResult.detectedPatterns,
                input: message.substring(0, 100) + (message.length > 100 ? "..." : ""),
                isAdmin: options.isAdmin || false
            });
            
            // Return a safe response instead of processing the malicious input
            return {
                response: "Girdiğiniz mesaj güvenlik kurallarımıza uymuyor. Lütfen ifadenizi değiştirerek tekrar deneyin.",
                debug: {
                    blocked: true,
                    riskScore: injectionResult.riskScore,
                    detectedPatterns: injectionResult.detectedPatterns
                }
            };
        }
        
        const isAdmin = options.isAdmin || false
        
        let tenantContext = ""
        if (options.tenantId && options.remoteQuery) {
            try {
                const { data } = await options.remoteQuery.graph({
                    entity: "tenant",
                    fields: ["name", "sector", "settings", "features"],
                    filters: { id: options.tenantId }
                });
                if (data && data.length > 0) {
                    const t = data[0];
                    tenantContext = `Mağaza: ${t.name}. Sektör: ${t.sector}. Ayarlar: ${JSON.stringify(t.settings || {})}`;
                    // Dinamik araçlar için sektör bilgisini options'a aktar
                    options.tenantSector = t.sector || "retail";
                }
            } catch (e) {
                this.logger_.warn(`[AynaChat] Failed to fetch tenant context for ${options.tenantId}`);
            }
        }

        // Determine cache type (skip if image query; different modalities not cacheable together)
        let cacheType: CacheType = CacheType.GENERAL;
        const hasImage = !!options.image;
        if (!hasImage) {
            cacheType = this.detectCacheType(message);
        }

        // Attempt semantic cache retrieval (only for text-only queries)
        if (!hasImage) {
            try {
                const cached = await this.semanticCache_.get(message, options.tenantId);
                if (cached) {
                    this.logger_.info("Semantic cache hit", {
                        query: message.substring(0, 50),
                        cacheKey: cached.cacheKey,
                        similarity: cached.metadata.tokensUsed // just for demo
                    });
                    return {
                        response: cached.response,
                        debug: {
                            ...cached.metadata,
                            cached: true,
                            model: "cached"
                        }
                    };
                }
            } catch (err: any) {
                this.logger_.error("Semantic cache get error", { error: err.message });
                // proceed without cache
            }
        }

        // Prepare generation options dynamically based on tenant sector
        const sector = options.tenantSector || "retail"
        const dynamicTools = getToolsForSector(sector, isAdmin)
        
        const genOptions: any = {
            temperature: 0.7,
            maxTokens: 1000,
            responseFormat: "text" as const,
            tools: dynamicTools
        }

        if (options.image) {
            genOptions.images = [options.image];
        }
        // 1. Get History/Insights
        const history: any[] = []
        if (options.customerId) {
            // @ts-ignore - memoryService has listMemoryInsights through MedusaService
            const insights = await this.memoryService_.listMemoryInsights({
                filters: { entity_id: options.customerId, is_archived: false },
                take: 10
            })
            if (insights?.length > 0) {
                history.push({
                    role: "user",
                    parts: [{ text: `[SYSTEM MEMORY] Customer context: ${insights.map((i: any) => i.content).join("; ")}` }]
                })
                history.push({ role: "model", parts: [{ text: "Understood." }] })
            }
        }

        // Create system prompt based on admin status
        const systemPrompt = isAdmin ? ADMIN_SYSTEM_PROMPT : GUARDIAN_SYSTEM_PROMPT

        // ── DÜRÜSTLÜK KATMANI: ürün/fiyat/stok'ta modeli DB'ye ZORLA bağla ──
        // Müşteri mesajıyla DAİMA gerçek ürün araması yap (kelime eşleşmesi yoksa boş döner,
        // genel sohbeti etkilemez). Bulunursa "GERÇEK VERİ" olarak enjekte et; model
        // fiyat/stok'u kafasından değil yalnızca bu veriden söyler. Olmayana "yok", olana "var".
        let productGrounding = ""
        if (!isAdmin && !options.image) {
            try {
                const search: any = await this.toolService_.handleToolCall(
                    "search_products",
                    { query: message, limit: 5 },
                    {
                        isAdmin: false,
                        tenantId: options.tenantId,
                        remoteQuery: options.remoteQuery,
                        productModuleService: options.productModuleService,
                    }
                )
                if (search?.products?.length > 0) {
                    productGrounding = `\n\n[GERÇEK ÜRÜN VERİSİ — veritabanından]\n` +
                        `Fiyat/stok sorulursa SADECE aşağıdaki listeden cevap ver. Listede olmayan ürün için "şu an katalogda görünmüyor" de; ASLA fiyat/stok uydurma.\n` +
                        JSON.stringify(search.products)
                } else {
                    productGrounding = `\n\n[GERÇEK ÜRÜN VERİSİ] Bu mesajla eşleşen ürün veritabanında bulunamadı. Fiyat/stok soruluyorsa dürüstçe "şu an böyle bir ürün katalogda görünmüyor" de; ASLA uydurma.`
                }
            } catch (e: any) {
                this.logger_.error(`[AynaChat] Ürün grounding hatası: ${e.message}`)
            }
        }

        // Kullanıcı mesajı (sistem talimatı ayrı system rolünde gider — reasoning modeller için).
        const userPrompt = `Tenant Context:\n${tenantContext}\n\nUser message: ${message}${productGrounding}`
        // Follow-up (/api/generate tek string) için sistem + kullanıcı birleşik.
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

        // Grounding zorunlu olduğu için düşünme VARSAYILAN KAPALI (hız). OLLAMA_CHAT_THINK=true ile açılır.
        genOptions.systemPrompt = systemPrompt
        genOptions.think = process.env.OLLAMA_CHAT_THINK === "true"

        // Generate response using hybrid AI provider
        let aiResponse = await this.hybridAIProvider_.generateText(userPrompt, genOptions)
        let finalResponse = aiResponse.text || ""
        let toolUsed = false

        // 2. Tool Loop - Function Calling Execution
        if (aiResponse.functionCalls && aiResponse.functionCalls.length > 0) {
            toolUsed = true
            this.logger_.info(`[AynaChat] Function calls detected: ${aiResponse.functionCalls.length}`)
            
            const toolResponses = []
            
            for (const call of aiResponse.functionCalls) {
                const toolName = call.name
                const toolArgs = call.args
                
                this.logger_.info(`[AynaChat] Executing tool: ${toolName}`)
                
                const toolResult = await this.toolService_.handleToolCall(toolName, toolArgs, {
                    isAdmin,
                    tenantId: options.tenantId,
                    remoteQuery: options.remoteQuery,
                    remoteLink: options.remoteLink,
                    productModuleService: options.productModuleService,
                    inventoryService: options.inventoryService,
                    stockLocationService: options.stockLocationService,
                    pricingModuleService: options.pricingModuleService,
                    salesChannelModuleService: options.salesChannelModuleService,
                    contentEngineService: options.contentEngineService,
                })
                
                toolResponses.push({
                    name: toolName,
                    result: toolResult
                })
            }
            
            const followUpPrompt = `${fullPrompt}\n\n[SYSTEM (INTERNAL): You called one or more tools. Here are the JSON results of those tool calls: ${JSON.stringify(toolResponses)}.\nNow, provide your final natural language response to the user based on these results. Yanıtı Türkçe ver. Yalnızca araç sonuçlarındaki gerçek verilere dayan; veri yoksa dürüstçe bilgi olmadığını söyle.]`

            // Follow-up çağrısında araçları kapat — model sonucu yorumlayıp
            // düz metin cevap üretsin, tekrar tool çağırmasın. Düşünme KAPALI (hız) +
            // sistem talimatı zaten fullPrompt içinde olduğundan systemPrompt verilmez.
            const followUpOptions = { ...genOptions, tools: undefined, think: false, systemPrompt: undefined }
            aiResponse = await this.hybridAIProvider_.generateText(followUpPrompt, followUpOptions)
            finalResponse = aiResponse.text || ""
        }

        // 3. Record Truth
        await this.memoryService_.recordTruth(options.customerId || "anonymous", "chat", {
            message: message.substring(0, 50),
            toolUsed,
            providerUsed: aiResponse.providerUsed
        })

        // Cache the response if no image and successful
        if (!hasImage) {
            try {
                const tokensUsed = aiResponse.usage?.totalTokens ?? 0;
                await this.semanticCache_.set(message, finalResponse, {
                    tokensUsed,
                    provider: aiResponse.providerUsed,
                    timestamp: Date.now(),
                    type: cacheType
                }, options.tenantId);
            } catch (err: any) {
                this.logger_.error("Semantic cache set error", { error: err.message });
            }
        }

        return {
            response: finalResponse,
            debug: {
                model: AI_CONFIG.ollamaModel,
                toolUsed,
                isAdmin,
                providerUsed: aiResponse.providerUsed
            }
        }
    }

    /**
     * Heuristic detection of query type for cache TTL selection
     */
    private detectCacheType(message: string): CacheType {
        const lower = message.toLowerCase();
        // Product-related keywords
        if (/\b(urun|ürün|product|stok|fiyat|kategori|model|beden|renk|stock|inventory|quantity)\b/i.test(lower)) {
            return CacheType.PRODUCT;
        }
        // Content/blog-related keywords
        if (/\b(blog|makale|haber|içerik|yazı|post|article|content|yazılım|haberler)\b/i.test(lower)) {
            return CacheType.CONTENT;
        }
        return CacheType.GENERAL;
    }
}
