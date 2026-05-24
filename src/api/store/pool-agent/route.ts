import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { applyRateLimit, createRateLimiter } from "../../../lib/rate-limiter"

const STORE_AI_LIMITER = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: "AI istek limiti aşıldı. Lütfen 1 dakika sonra tekrar deneyin.",
})

type AuthContextRequest = MedusaRequest & {
    auth_context?: {
        actor_id?: string
    }
}

type AynaService = {
    processMessage: (prompt: string, options: { customerId?: string; isAdmin: boolean }) => Promise<unknown>
}

const PoolAgentRequestSchema = z.object({
    message: z.string().min(1, "Message is required."),
})

/**
 * POST /store/pool-agent
 * Havuz Mühendisi Ajanı — Müşteriden ölçü alıp kimyasal hesaplama yapar
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    if (await applyRateLimit(req, res, STORE_AI_LIMITER)) {
        return
    }

    try {
        const aynaService = req.scope.resolve("ayna") as AynaService
        const { message } = PoolAgentRequestSchema.parse(req.body)
        const customerId = (req as AuthContextRequest).auth_context?.actor_id

        // Pool agent uses a focused prompt approach
        const poolPrompt = `Sen bir havuz mühendisisin. Müşterinin havuz boyutlarını öğren (en, boy, derinlik) ve kimyasal hesaplaması yap.
Eğer veriler tamsa: calculatePoolChemicals tool'unu kullan ve sonucu açıkla.
Eğer veriler eksikse: Eksik bilgiyi nazikçe iste.
Müşteri mesajı: ${message}`

        const result = await aynaService.processMessage(poolPrompt, {
            customerId,
            isAdmin: false,
        })

        return res.status(200).json(result)
    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any
        const message = error instanceof Error ? error.message : "Unknown error"
        logger.error(`[Pool Agent] Error: ${message}`)

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: "Geçersiz istek",
                details: error.issues,
            })
        }

        return res.status(500).json({
            response: "Havuz mühendisi şu an bakımdadır. Lütfen daha sonra tekrar deneyin.",
        })
    }
}
