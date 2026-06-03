import { Logger, RemoteQueryFunction, Context } from "@medusajs/framework/types"
import { AI_CONFIG } from "../../../lib/ai-config"
import { GUARDIAN_SYSTEM_PROMPT, ADMIN_SYSTEM_PROMPT } from "../prompts/guardian-prompt"
import AynaMemoryService from "./memory-service"
import AynaToolService from "./tool-service"
import { HybridAIProviderService } from "./hybrid-ai.provider"
import { SemanticCacheService, CacheType } from "../../../lib/cache/semantic-cache.service"
import { N8nBridgeService } from "../../../lib/n8n-bridge"
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
            storeGeneratorTool
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
    protected n8nBridge_: N8nBridgeService

    constructor({ logger, aynaMemoryService, aynaToolService, hybridAIProvider, injectionDetectorService }: InjectedDependencies) {
        this.logger_ = logger
        this.memoryService_ = aynaMemoryService
        this.toolService_ = aynaToolService
        this.hybridAIProvider_ = hybridAIProvider
        this.injectionDetectorService_ = injectionDetectorService
        this.semanticCache_ = SemanticCacheService.getInstance()
        this.n8nBridge_ = new N8nBridgeService(logger)
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
                response: "I'm unable to process that request as it appears to contain inappropriate content. Please rephrase your question.",
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

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // n8n BRIDGE — Grounded + Validated AI
        // Eğer n8n köprüsü aktifse tüm mesajlar n8n'e yönlendirilir.
        // n8n tarafında: SQL grounding → AI Agent → Validation Loop
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (this.n8nBridge_.isEnabled()) {
            try {
                this.logger_.info("[AynaChat] Routing to n8n bridge (grounded mode)")

                const n8nResponse = await this.n8nBridge_.chat({
                    message,
                    customer_id: options.customerId || null,
                    customer_group: options.customerGroup || "B2C_Retail",
                    is_admin: isAdmin,
                    image: options.image || null,
                    tenant_id: options.tenantId || null,
                    tenant_context: tenantContext || null,
                })

                // Record truth even when using n8n
                await this.memoryService_.recordTruth(
                    options.customerId || "anonymous",
                    "chat_n8n",
                    {
                        message: message.substring(0, 50),
                        grounded: n8nResponse.grounded,
                        validated: n8nResponse.validated,
                        intent: n8nResponse.intent,
                        retryCount: n8nResponse.retry_count || 0,
                    }
                )

                return {
                    response: n8nResponse.response,
                    debug: {
                        model: "n8n-grounded-gemini",
                        provider: "n8n",
                        grounded: n8nResponse.grounded,
                        validated: n8nResponse.validated,
                        intent: n8nResponse.intent,
                        productCount: n8nResponse.product_count,
                        retryCount: n8nResponse.retry_count,
                        isAdmin,
                    },
                }
            } catch (n8nError: unknown) {
                const errMsg = n8nError instanceof Error ? n8nError.message : String(n8nError)
                this.logger_.warn(`[AynaChat] n8n bridge failed, falling back to direct LLM: ${errMsg}`)
                // Fall through to direct LLM below
            }
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // DIRECT LLM FALLBACK — Eski akış (n8n kapalıysa veya erişilemezse)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
        
        const genOptions = {
            temperature: 0.7,
            maxTokens: 1000,
            responseFormat: "text" as const,
            tools: dynamicTools
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

        // Combine system prompt with user message for the AI provider
        const fullPrompt = `${systemPrompt}\n\nTenant Context:\n${tenantContext}\n\nUser message: ${message}`

        // Generate response using hybrid AI provider
        let aiResponse = await this.hybridAIProvider_.generateText(fullPrompt, genOptions)
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
                    productModuleService: options.productModuleService,
                    inventoryService: options.inventoryService,
                    pricingModuleService: options.pricingModuleService,
                    contentEngineService: options.contentEngineService,
                })
                
                toolResponses.push({
                    name: toolName,
                    result: toolResult
                })
            }
            
            const followUpPrompt = `${fullPrompt}\n\n[SYSTEM (INTERNAL): You called one or more tools. Here are the JSON results of those tool calls: ${JSON.stringify(toolResponses)}.\nNow, provide your final natural language response to the user based on these results.]`
            
            aiResponse = await this.hybridAIProvider_.generateText(followUpPrompt, genOptions)
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
                model: aiResponse.providerUsed === "gemini" ? AI_CONFIG.geminiModel : AI_CONFIG.ollamaModel,
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
