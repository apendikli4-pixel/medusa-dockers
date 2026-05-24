import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { applyRateLimit, CONTENT_LIMITER } from "../../../lib/rate-limiter"
import { z } from "@medusajs/framework/zod"

const GenerateContentSchema = z.object({
    prompt: z.string().min(1).max(4000),
})

export async function generateAiContent(prompt: string) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
        throw new Error("No API Key configured on server")
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const modelName = process.env.GEMINI_MODEL_NAME || "gemini-3-flash-preview"
    const model = genAI.getGenerativeModel({ model: modelName })

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

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

