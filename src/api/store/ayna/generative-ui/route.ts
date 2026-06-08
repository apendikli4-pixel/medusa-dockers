import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createRateLimiter, applyRateLimit } from "../../../../lib/rate-limiter"
import { RATE_LIMITS } from "../../../../config/rate-limits"

const genUIRateLimiter = createRateLimiter(RATE_LIMITS.storeAynaChat.limit)

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    try {
        const blocked = await applyRateLimit(req, res, genUIRateLimiter)
        if (blocked) return

        const aynaService = req.scope.resolve("ayna") as any
        
        let customerId: string | undefined = undefined;

        // auth_context: Medusa's JWT/session verified object
        if ((req as any).auth_context && (req as any).auth_context.actor_id) {
            customerId = (req as any).auth_context.actor_id
        }

        const result = await aynaService.generateGenerativeUI(customerId)

        return res.status(200).json(result)
    } catch (error: any) {
        const logger = req.scope.resolve("logger") as any
        logger.error(`[Generative UI] Error: ${error.message}`)

        return res.status(200).json({
            heroTitle: "Ayna Genesis",
            heroTagline: "Dürüstlük odaklı e-ticaret — yapay zeka asistanlı, çok mağazalı.",
            recommendedSearchQuery: "",
            themeMode: "premium"
        })
    }
}
