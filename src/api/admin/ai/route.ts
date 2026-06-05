import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ollamaConfigured } from "../../../lib/ollama-client"

/**
 * AI motoru durum (health) endpoint'i.
 * Gemini kaldırıldı; AI motoru artık yalnızca açık kaynak Ollama.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const model = process.env.OLLAMA_MODEL_NAME || "qwen2.5:14b"
    const embedModel = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text"
    const url = process.env.OLLAMA_API_URL || "http://host.docker.internal:11434"

    if (!ollamaConfigured()) {
        res.status(503).json({
            configured: false,
            provider: "ollama",
            model,
            message: "Ollama (OLLAMA_API_URL) not configured on server."
        })
        return
    }

    res.json({
        configured: true,
        provider: "ollama",
        model,
        embedModel,
        url,
    })
}
