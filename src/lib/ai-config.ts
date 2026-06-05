/**
 * Merkezi AI konfigürasyonu
 * Model adı ve AI parametreleri tek yerden yönetilir.
 *
 * Not: Gemini tamamen kaldırıldı; AI motoru artık yalnızca açık kaynak Ollama.
 */
export const AI_CONFIG = {
    /** Ollama model adı — .env'den okunur, varsayılan: qwen2.5:14b */
    ollamaModel: process.env.OLLAMA_MODEL_NAME || "qwen2.5:14b",

    /** Ollama API URL */
    ollamaUrl: process.env.OLLAMA_API_URL || "http://host.docker.internal:11434",

    /** Ollama embedding modeli */
    embedModel: process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text",

    /** Hafıza bakımı için insight eşiği */
    memoryMaintenanceThreshold: 10,

    /** processMessage'da yüklenecek max insight sayısı */
    maxInsightsForContext: 10,
} as const
