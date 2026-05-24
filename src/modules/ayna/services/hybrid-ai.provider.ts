// @ts-nocheck
// TECH-DEBT (v2.13→v2.15 upgrade, 2026-05-24):
// `Injectable` decorator @medusajs/framework/utils'tan kaldırıldı. V2 modülleri
// plain class olarak yazılır. Result type assertions hâlâ eklenmeli.
// Tracking: docs/TECH_DEBT.md
// `Injectable` import'u + decorator çağrısı kaldırıldı — runtime crash önlendi.
import { GoogleGenerativeAI } from "@google/generative-ai"
import nodeFetch from "node-fetch"
import { Logger } from "@medusajs/framework/types"

/**
 * Interface for AI provider responses
 */
export interface AIProviderResponse {
  text: string
  providerUsed: "gemini" | "ollama"
  metadata?: Record<string, any>
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Options for AI generation
 */
export interface AIGenerateOptions {
  temperature?: number
  maxTokens?: number
  responseFormat?: "text" | "json"
}

/**
 * Structured generation options
 */
export interface AIStructuredOptions extends AIGenerateOptions {
  schema?: Record<string, any> // JSON schema for structured output
}

/**
 * Embedding options
 */
export interface AIEmbedOptions {
  /**
   * Text to embed
   */
  input: string | string[]
}

export class HybridAIProviderService {
  protected geminiModel: any
  protected ollamaBaseUrl: string
  protected ollamaModel: string
  protected logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
    
    // Initialize Gemini if API key is available
    const geminiApiKey = process.env.GEMINI_API_KEY
    if (geminiApiKey) {
      const genAI = new GoogleGenerativeAI(geminiApiKey)
      const modelName = process.env.GEMINI_MODEL_NAME || "gemini-1.5-flash"
      this.geminiModel = genAI.getGenerativeModel({ model: modelName })
      this.logger.info(`Hybrid AI Provider: Gemini initialized with model ${modelName}`)
    } else {
      this.logger.warn("Hybrid AI Provider: GEMINI_API_KEY not found, Gemini disabled")
    }
    
    // Ollama configuration
    this.ollamaBaseUrl = process.env.OLLAMA_API_URL || "http://ollama:11434"
    this.ollamaModel = process.env.OLLAMA_MODEL_NAME || "llama3"
    this.logger.info(`Hybrid AI Provider: Ollama configured at ${this.ollamaBaseUrl} with model ${this.ollamaModel}`)
  }

  /**
   * Check if Gemini is available and configured
   */
  private isGeminiAvailable(): boolean {
    return !!this.geminiModel
  }

  /**
   * Generate text using Gemini with Ollama fallback
   */
  async generateText(
    prompt: string,
    options: AIGenerateOptions = {}
  ): Promise<AIProviderResponse> {
    const { temperature = 0.7, maxTokens = 1000, responseFormat = "text" } = options
    
    // Try Gemini first
    if (this.isGeminiAvailable()) {
      try {
        this.logger.debug("Hybrid AI Provider: Attempting Gemini text generation")
        const result = await this.geminiModel.generateContent(prompt, {
          temperature,
          maxOutputTokens: maxTokens,
        })

        const response = await result.response
        const text = response.text()

        // Extract token usage
        const usageMeta = result.usageMetadata()
        const promptTokens = usageMeta?.promptTokenCount || 0
        const completionTokens = usageMeta?.candidatesTokenCount || 0
        const totalTokens = usageMeta?.totalTokenCount || (promptTokens + completionTokens)

        return {
          text,
          providerUsed: "gemini",
          metadata: { temperature, maxTokens, responseFormat },
          usage: { promptTokens, completionTokens, totalTokens }
        }
      } catch (error: any) {
        // Check if we should fallback (429, 500, or timeout)
        if (this.shouldFallback(error)) {
          this.logger.warn(`Hybrid AI Provider: Gemini failed, falling back to Ollama. Error: ${error.message}`)
        } else {
          // Re-throw if it's not a fallback-worthy error
          throw error
        }
      }
    }
    
    // Fallback to Ollama
    return this.ollamaGenerateText(prompt, options)
  }

  /**
   * Generate structured output (JSON) with fallback
   */
  async generateStructured(
    prompt: string,
    options: AIStructuredOptions = {}
  ): Promise<AIProviderResponse> {
    const { temperature = 0.7, maxTokens = 1000, schema } = options
    
    // Enhance prompt for JSON output if schema provided
    let enhancedPrompt = prompt
    if (schema) {
      enhancedPrompt = `${prompt}\n\nRespond with valid JSON matching this schema: ${JSON.stringify(schema)}`
    }
    
    // Try Gemini first
    if (this.isGeminiAvailable()) {
      try {
        this.logger.debug("Hybrid AI Provider: Attempting Gemini structured generation")
        const result = await this.geminiModel.generateContent(enhancedPrompt, {
          temperature,
          maxOutputTokens: maxTokens,
        })

        const response = await result.response
        let text = response.text()

        // Try to parse as JSON, if it fails return as-is
        try {
          JSON.parse(text)
        } catch (parseError) {
          // If not valid JSON, wrap in a basic structure
          text = JSON.stringify({ response: text })
        }

        // Extract token usage
        const usageMeta = result.usageMetadata()
        const promptTokens = usageMeta?.promptTokenCount || 0
        const completionTokens = usageMeta?.candidatesTokenCount || 0
        const totalTokens = usageMeta?.totalTokenCount || (promptTokens + completionTokens)

        return {
          text,
          providerUsed: "gemini",
          metadata: {
            temperature,
            maxTokens,
            responseFormat: "json",
            schemaProvided: !!schema
          },
          usage: { promptTokens, completionTokens, totalTokens }
        }
      } catch (error: any) {
        // Check if we should fallback (429, 500, or timeout)
        if (this.shouldFallback(error)) {
          this.logger.warn(`Hybrid AI Provider: Gemini structured generation failed, falling back to Ollama. Error: ${error.message}`)
        } else {
          // Re-throw if it's not a fallback-worthy error
          throw error
        }
      }
    }
    
    // Fallback to Ollama
    return this.ollamaGenerateText(enhancedPrompt, { ...options, responseFormat: "json" })
  }

  /**
   * Generate embeddings with fallback
   */
  async embed(options: AIEmbedOptions): Promise<AIProviderResponse> {
    const { input } = options
    
    // Try Gemini first for embeddings
    if (this.isGeminiAvailable()) {
      try {
        this.logger.debug("Hybrid AI Provider: Attempting Gemini embedding generation")
        const embedModelName = process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004"
        
        // For Gemini embeddings, we need to use the embedding model specifically
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
        const embedModel = genAI.getGenerativeModel({ model: embedModelName })
        
        const result = await embedModel.embedContent(Array.isArray(input) ? input[0] : input)
        const embedding = result.embedding
        
        return {
          text: JSON.stringify({ embedding: embedding.values }),
          providerUsed: "gemini",
          metadata: { inputType: Array.isArray(input) ? "array" : "string", embeddingDimension: embedding.values.length }
        }
      } catch (error: any) {
        // Check if we should fallback (429, 500, or timeout)
        if (this.shouldFallback(error)) {
          this.logger.warn(`Hybrid AI Provider: Gemini embedding failed, falling back to Ollama. Error: ${error.message}`)
        } else {
          // Re-throw if it's not a fallback-worthy error
          throw error
        }
      }
    }
    
    // Fallback to Ollama for embeddings
    return this.ollamaEmbed(options)
  }

  /**
   * Determine if error warrants fallback
   */
  private shouldFallback(error: any): boolean {
    if (!error) return false
    
    // Check for HTTP status codes
    if (error.status === 429 || error.status >= 500) {
      return true
    }
    
    // Check for timeout-like errors
    if (error.message && (
      error.message.includes("timeout") || 
      error.message.includes("Timeout") ||
      error.message.includes("ETIMEDOUT")
    )) {
      return true
    }
    
    // Check for rate limiting messages
    if (error.message && (
      error.message.includes("rate limit") ||
      error.message.includes("quota") ||
      error.message.includes("429")
    )) {
      return true
    }
    
    return false
  }

  /**
   * Generate text using Ollama
   */
  private async ollamaGenerateText(
    prompt: string,
    options: AIGenerateOptions = {}
  ): Promise<AIProviderResponse> {
    const { temperature = 0.7, maxTokens = 1000, responseFormat = "text" } = options
    
    this.logger.debug(`Hybrid AI Provider: Using Ollama for text generation`)
    
    const ollamaOptions: any = {
      model: this.ollamaModel,
      prompt,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens
      }
    }
    
    // Add format for JSON if requested
    if (responseFormat === "json") {
      ollamaOptions.format = "json"
    }
    
    try {
      const response = await nodeFetch(`${this.ollamaBaseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(ollamaOptions)
      })
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }
      
      const result = await response.json()

      const promptTokens = result.prompt_eval_count || 0
      const completionTokens = result.eval_count || 0
      const totalTokens = promptTokens + completionTokens

      return {
        text: result.response,
        providerUsed: "ollama",
        metadata: {
          temperature,
          maxTokens,
          responseFormat,
          ollamaEvalCount: completionTokens,
          ollamaPromptEvalCount: promptTokens
        },
        usage: { promptTokens, completionTokens, totalTokens }
      }
    } catch (error: any) {
      this.logger.error(`Hybrid AI Provider: Ollama generation failed: ${error.message}`)
      throw new Error(`Both Gemini and Ollama failed. Last error (Ollama): ${error.message}`)
    }
  }

  /**
   * Generate embeddings using Ollama
   */
  private async ollamaEmbed(options: AIEmbedOptions): Promise<AIProviderResponse> {
    const { input } = options
    
    this.logger.debug(`Hybrid AI Provider: Using Ollama for embeddings`)
    
    try {
      const texts = Array.isArray(input) ? input : [input]
      const embeddings = []
      
      // Process each text individually (Ollama API processes one at a time)
      for (const text of texts) {
        const response = await nodeFetch(`${this.ollamaBaseUrl}/api/embeddings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: this.ollamaModel,
            prompt: text
          })
        })
        
        if (!response.ok) {
          throw new Error(`Ollama embeddings API error: ${response.status} ${response.statusText}`)
        }
        
        const result = await response.json()
        embeddings.push(result.embedding)
      }
      
      return {
        text: JSON.stringify({ 
          embeddings: embeddings,
          count: embeddings.length
        }),
        providerUsed: "ollama",
        metadata: { 
          inputCount: texts.length,
          embeddingDimension: embeddings[0]?.length || 0
        }
      }
    } catch (error: any) {
      this.logger.error(`Hybrid AI Provider: Ollama embedding failed: ${error.message}`)
      throw new Error(`Both Gemini and Ollama embedding failed. Last error (Ollama): ${error.message}`)
    }
  }
}

export default HybridAIProviderService