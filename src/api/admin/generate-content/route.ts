import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { applyRateLimit, CONTENT_LIMITER } from "../../../lib/rate-limiter"
import { z } from "@medusajs/framework/zod"
import { ollamaGenerate, ollamaConfigured } from "../../../lib/ollama-client"

const GenerateContentSchema = z.object({
    prompt: z.string().min(1).max(4000),
})

export async function generateAiContent(prompt: string) {
    if (!ollamaConfigured()) {
        throw new Error("No AI engine configured on server (Ollama)")
    }

    const text = await ollamaGenerate(prompt, { temperature: 0.5, maxTokens: 1500 })
    return text.replace(/```json|```/g, "").trim()
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    // Rate limiting check (5 requests/minute for content generation)
    if (await applyRateLimit(req, res, CONTENT_LIMITER)) {
        return // Request was blocked
    }

    try {
        const { prompt } = GenerateContentSchema.parse(req.body)

        const result = await generateAiContent(prompt)
        res.json({ result })

    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: "Geçersiz istek",
                details: error.issues,
            })
        }

        const logger = req.scope.resolve("logger") as any
        const message = error instanceof Error ? error.message : "Unknown error"
        logger.error(`[Admin Generate Content] ${message}`)

        res.status(500).json({
            message: "AI Generation Failed",
        })
    }
}

