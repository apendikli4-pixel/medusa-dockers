/**
 * HybridAIProviderService — Açık kaynak (Ollama) tek motor.
 *
 * Tarihçe:
 *  - Önceden Gemini birincil + Ollama yedek hibrit yapıydı.
 *  - 2026-06: Gemini TAMAMEN kaldırıldı (kota bağımlılığı + kapalı kaynak).
 *    Artık yalnızca Ollama (varsayılan qwen2.5:14b) kullanılıyor — tam açık kaynak,
 *    self-hosted, kota yok, veri dışarı çıkmaz.
 *  - Sınıf adı ve public arayüz (generateText/generateStructured/embed) geriye
 *    uyumluluk için korundu; çağıran kod (chat-service, blog/generate) değişmedi.
 */
import { Logger } from "@medusajs/framework/types"

// Node 20+ global fetch sağlıyor.
const nodeFetch = globalThis.fetch

// ─── OLLAMA API TİPLERİ ────────────────────────────────────────────

/**
 * Ollama /api/generate response şeması.
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md
 */
interface OllamaGenerateResponse {
    model: string
    created_at: string
    response: string
    done: boolean
    prompt_eval_count?: number
    eval_count?: number
    total_duration?: number
}

interface OllamaEmbeddingResponse {
    embedding: number[]
}

/**
 * AI provider yanıt arayüzü.
 * providerUsed her zaman "ollama" (Gemini kaldırıldı; tip geriye uyumlu tutuldu).
 */
export interface AIProviderResponse {
    text: string
    providerUsed: "ollama"
    metadata?: Record<string, any>
    functionCalls?: any[]
    usage?: {
        promptTokens: number
        completionTokens: number
        totalTokens: number
    }
}

export interface AIGenerateOptions {
    temperature?: number
    maxTokens?: number
    responseFormat?: "text" | "json"
    tools?: any[]
}

export interface AIStructuredOptions extends AIGenerateOptions {
    schema?: Record<string, any>
}

export interface AIEmbedOptions {
    input: string | string[]
}

export class HybridAIProviderService {
    protected ollamaBaseUrl: string
    protected ollamaModel: string
    protected embedModel: string
    protected logger: Logger

    constructor(logger: Logger) {
        this.logger = logger

        this.ollamaBaseUrl = process.env.OLLAMA_API_URL || "http://host.docker.internal:11434"
        this.ollamaModel = process.env.OLLAMA_MODEL_NAME || "qwen2.5:14b"
        // Embedding için ayrı, hafif bir model kullanmak idealdir (nomic-embed-text).
        // Yoksa ana modele düşer.
        this.embedModel = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text"

        this.logger.info(
            `AI Provider: Ollama (açık kaynak) — ${this.ollamaBaseUrl}, model: ${this.ollamaModel}, embed: ${this.embedModel}`
        )
    }

    /**
     * Düz metin üretimi.
     */
    async generateText(
        prompt: string,
        options: AIGenerateOptions = {}
    ): Promise<AIProviderResponse> {
        return this.ollamaGenerateText(prompt, options)
    }

    /**
     * Yapılandırılmış (JSON) çıktı üretimi.
     */
    async generateStructured(
        prompt: string,
        options: AIStructuredOptions = {}
    ): Promise<AIProviderResponse> {
        const { schema } = options
        let enhancedPrompt = prompt
        if (schema) {
            enhancedPrompt = `${prompt}\n\nYanıtı şu JSON şemasına uygun, geçerli JSON olarak ver: ${JSON.stringify(schema)}`
        }
        return this.ollamaGenerateText(enhancedPrompt, {
            ...options,
            responseFormat: "json",
        })
    }

    /**
     * Embedding üretimi.
     */
    async embed(options: AIEmbedOptions): Promise<AIProviderResponse> {
        return this.ollamaEmbed(options)
    }

    /**
     * Ollama ile metin üretimi (AbortController timeout'lu).
     */
    private async ollamaGenerateText(
        prompt: string,
        options: AIGenerateOptions = {}
    ): Promise<AIProviderResponse> {
        const { temperature = 0.7, maxTokens = 1000, responseFormat = "text" } = options

        const ollamaOptions: any = {
            model: this.ollamaModel,
            prompt,
            stream: false,
            options: {
                temperature,
                num_predict: maxTokens,
            },
        }
        if (responseFormat === "json") {
            ollamaOptions.format = "json"
        }

        const timeoutMs = parseInt(process.env.OLLAMA_TIMEOUT_MS || "290000", 10)
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeoutMs)

        try {
            let response: Response
            try {
                response = await nodeFetch(`${this.ollamaBaseUrl}/api/generate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(ollamaOptions),
                    signal: controller.signal,
                })
            } finally {
                clearTimeout(timer)
            }

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
            }

            const result = (await response.json()) as OllamaGenerateResponse
            const promptTokens = result.prompt_eval_count || 0
            const completionTokens = result.eval_count || 0

            return {
                text: result.response,
                providerUsed: "ollama",
                metadata: {
                    temperature,
                    maxTokens,
                    responseFormat,
                    ollamaEvalCount: completionTokens,
                    ollamaPromptEvalCount: promptTokens,
                },
                usage: {
                    promptTokens,
                    completionTokens,
                    totalTokens: promptTokens + completionTokens,
                },
            }
        } catch (error: any) {
            this.logger.error(`AI Provider: Ollama üretim hatası: ${error.message}`)
            throw new Error(`Ollama yanıt veremedi: ${error.message}`)
        }
    }

    /**
     * Ollama ile embedding üretimi.
     */
    private async ollamaEmbed(options: AIEmbedOptions): Promise<AIProviderResponse> {
        const { input } = options
        try {
            const texts = Array.isArray(input) ? input : [input]
            const embeddings: number[][] = []

            for (const text of texts) {
                const response = await nodeFetch(`${this.ollamaBaseUrl}/api/embeddings`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ model: this.embedModel, prompt: text }),
                })
                if (!response.ok) {
                    throw new Error(`Ollama embeddings API error: ${response.status} ${response.statusText}`)
                }
                const result = (await response.json()) as OllamaEmbeddingResponse
                embeddings.push(result.embedding)
            }

            return {
                text: JSON.stringify({ embeddings, count: embeddings.length }),
                providerUsed: "ollama",
                metadata: {
                    inputCount: texts.length,
                    embeddingDimension: embeddings[0]?.length || 0,
                },
            }
        } catch (error: any) {
            this.logger.error(`AI Provider: Ollama embedding hatası: ${error.message}`)
            throw new Error(`Ollama embedding üretemedi: ${error.message}`)
        }
    }
}

export default HybridAIProviderService
