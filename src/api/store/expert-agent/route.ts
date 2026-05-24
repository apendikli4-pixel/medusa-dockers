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

const ExpertAgentRequestSchema = z.object({
    message: z.string().min(1, "Message is required."),
    expertise: z.string().optional().default("uzman danışman"), // tenant can pass expertise context
})

/**
 * POST /store/expert-agent
 * Uzman Danışman Ajanı — Sektöre özel hesaplama ve danışmanlık yapar
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    if (await applyRateLimit(req, res, STORE_AI_LIMITER)) {
        return
    }

    try {
        const aynaService = req.scope.resolve("ayna") as AynaService
        const { message, expertise } = ExpertAgentRequestSchema.parse(req.body)
        const customerId = (req as AuthContextRequest).auth_context?.actor_id

        // Sektörel veya tenant bazlı dinamik prompt
        const expertPrompt = `Sen bir ${expertise}sın. Müşterinin ihtiyaçlarını anla, gerekirse teknik ölçüleri (alan, hacim, ebat vb.) al ve uygun ürün hesaplaması yap.
Eğer veriler tamsa: volumeCalculator tool'unu kullanarak hesapla ve sonucu açıkla.
Eğer veriler eksikse: Eksik bilgiyi nazikçe iste.
Müşteri mesajı: ${message}`

        const result = await aynaService.processMessage(expertPrompt, {
            customerId,
            isAdmin: false,
        })

        return res.status(200).json(result)
    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any
        const message = error instanceof Error ? error.message : "Unknown error"
        logger.error(`[Expert Agent] Error: ${message}`)

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: "Geçersiz istek",
                details: error.issues,
            })
        }

        return res.status(500).json({
            response: "Uzman danışmanımız şu an bakımdadır. Lütfen daha sonra tekrar deneyin.",
        })
    }
}
