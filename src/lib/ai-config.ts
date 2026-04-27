/**
 * Merkezi AI konfigürasyonu
 * Model adı ve AI parametreleri tek yerden yönetilir.
 */
export const AI_CONFIG = {
    /** Gemini model adı — .env'den okunur, varsayılan: gemini-1.5-flash */
    geminiModel: process.env.GEMINI_MODEL_NAME || "gemini-1.5-flash",

    /** Ollama fallback model adı */
    ollamaModel: process.env.OLLAMA_MODEL_NAME || "llama3",

    /** Ollama API URL */
    ollamaUrl: process.env.OLLAMA_API_URL,

    /** Gemini API key */
    geminiApiKey: process.env.GEMINI_API_KEY,

    /** Hafıza bakımı için insight eşiği */
    memoryMaintenanceThreshold: 10,

    /** processMessage'da yüklenecek max insight sayısı */
    maxInsightsForContext: 10,
} as const
