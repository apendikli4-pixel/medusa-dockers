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

// Tool definitions (Importing placeholders for context)
import { volumeCalculatorTool } from "../tools/volume-calculator-tool"
import { productSearchTool } from "../tools/product-tool"
import { inventoryCheckTool } from "../tools/inventory-tool"
import { conscienceTool } from "../tools/conscience-tool"

const STORE_TOOLS = [volumeCalculatorTool, productSearchTool, inventoryCheckTool, conscienceTool]

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

        // Prepare generation options
        const genOptions = {
            temperature: 0.7,
            maxTokens: 1000,
            responseFormat: "text" as const
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
        const aiResponse = await this.hybridAIProvider_.generateText(fullPrompt, genOptions)
        const finalResponse = aiResponse.text

        // 2. Tool Loop - We need to check if the response suggests using tools
        // For simplicity, we'll check if the response contains certain patterns that indicate tool usage
        // In a more sophisticated implementation, we'd use function calling capabilities
        let toolUsed = false
        // Simple check for tool usage patterns in response
        if (finalResponse.includes("tool:") || finalResponse.includes("action:")) {
            toolUsed = true
            // Here we would normally parse and execute tools
            // For now, we'll just note that tools might be used
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
