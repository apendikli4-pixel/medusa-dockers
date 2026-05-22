import { Logger } from "@medusajs/framework/types"

/**
 * N8nBridgeService — Medusa ↔ n8n Köprüsü
 *
 * Tüm LLM çağrılarını n8n webhook'una yönlendirir.
 * n8n tarafında: grounding SQL → AI Agent → validation loop çalışır.
 * Bu servis sadece sonucu bekler ve döndürür.
 *
 * Fallback: n8n erişilemezse veya hata dönerse güvenli mesaj döner.
 */

export interface N8nChatRequest {
    message: string
    customer_id?: string | null
    customer_group?: string
    is_admin?: boolean
    image?: string | null
    tenant_id?: string | null
    tenant_context?: string | null
}

export interface N8nChatResponse {
    response: string
    grounded: boolean
    validated: boolean
    intent?: string
    product_count?: number
    retry_count?: number
    validation_passed?: boolean
    max_retries_reached?: boolean
    validation_errors?: string[]
    timestamp?: string
}

interface N8nBridgeConfig {
    /** n8n webhook URL (Docker internal) */
    webhookUrl: string
    /** Request timeout in ms */
    timeoutMs: number
    /** Whether the bridge is enabled */
    enabled: boolean
}

const SAFE_FALLBACK_RESPONSE: N8nChatResponse = {
    response: "Şu anda yapay zeka servisimize ulaşılamıyor. Lütfen birkaç dakika sonra tekrar deneyin veya doğrudan bizimle iletişime geçin.",
    grounded: false,
    validated: false,
}

export class N8nBridgeService {
    protected logger_: Logger
    protected config_: N8nBridgeConfig

    constructor(logger: Logger) {
        this.logger_ = logger

        const webhookBase = process.env.N8N_WEBHOOK_URL || "http://n8n:5678"
        const webhookPath = process.env.N8N_CHAT_WEBHOOK_PATH || "/webhook/ayna-grounded-chat"

        this.config_ = {
            webhookUrl: `${webhookBase}${webhookPath}`,
            timeoutMs: parseInt(process.env.N8N_TIMEOUT_MS || "30000", 10),
            enabled: process.env.N8N_BRIDGE_ENABLED === "true",
        }

        if (this.config_.enabled) {
            this.logger_.info(`[N8nBridge] Enabled — Webhook: ${this.config_.webhookUrl}`)
        } else {
            this.logger_.info("[N8nBridge] Disabled — Direct LLM mode active")
        }
    }

    /**
     * n8n köprüsünün aktif olup olmadığını kontrol eder
     */
    isEnabled(): boolean {
        return this.config_.enabled
    }

    /**
     * Ana chat metodu — mesajı n8n'e gönderir, doğrulanmış yanıtı bekler.
     *
     * n8n tarafında:
     *   1. Intent extraction
     *   2. SQL grounding (ürün + stok + fiyat)
     *   3. AI Agent (Gemini)
     *   4. Validation Check (ürün ID, fiyat, JSON)
     *   5. Gerekirse retry loop (max 3)
     */
    async chat(request: N8nChatRequest): Promise<N8nChatResponse> {
        if (!this.config_.enabled) {
            throw new Error("N8nBridge is disabled. Set N8N_BRIDGE_ENABLED=true to activate.")
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config_.timeoutMs)

        try {
            this.logger_.info("[N8nBridge] Sending request to n8n", {
                message: request.message.substring(0, 80),
                customerId: request.customer_id || "anonymous",
                isAdmin: request.is_admin || false,
            })

            const response = await fetch(this.config_.webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(request),
                signal: controller.signal,
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
                this.logger_.error("[N8nBridge] n8n returned HTTP error", {
                    status: response.status,
                    statusText: response.statusText,
                })
                return SAFE_FALLBACK_RESPONSE
            }

            const data = (await response.json()) as N8nChatResponse

            // Log validation result
            if (data.validated) {
                this.logger_.info("[N8nBridge] Response validated successfully", {
                    intent: data.intent,
                    productCount: data.product_count,
                    retryCount: data.retry_count || 0,
                })
            } else if (data.max_retries_reached) {
                this.logger_.warn("[N8nBridge] Max retries reached — returning unvalidated response", {
                    errors: data.validation_errors,
                })
            }

            return data
        } catch (error: unknown) {
            clearTimeout(timeoutId)
            const errMsg = error instanceof Error ? error.message : String(error)

            if (errMsg.includes("abort") || errMsg.includes("AbortError")) {
                this.logger_.error(`[N8nBridge] Request timed out after ${this.config_.timeoutMs}ms`)
            } else {
                this.logger_.error(`[N8nBridge] Request failed: ${errMsg}`)
            }

            return SAFE_FALLBACK_RESPONSE
        }
    }
}

export default N8nBridgeService
