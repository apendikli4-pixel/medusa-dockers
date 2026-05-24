import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

const RedeemSchema = z.object({
    points: z.number().int().min(500, "Minimum 500 puan"),
})

/**
 * GET /store/loyalty — bakiye ve geçmiş
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const customerId = (req as any).auth_context?.actor_id
    if (!customerId) return res.status(401).json({ error: "Giriş yapmanız gerekiyor." })

    try {
        const loyaltyService = req.scope.resolve("loyalty") as any
        const [balance, history, info] = await Promise.all([
            loyaltyService.getBalance(customerId),
            loyaltyService.getHistory(customerId),
            Promise.resolve(loyaltyService.getRedemptionInfo()),
        ])
        return res.status(200).json({ balance, history, redemption_info: info })
    } catch (e: any) {
        return res.status(500).json({ error: "Puan bilgisi alınamadı." })
    }
}

/**
 * POST /store/loyalty/redeem — puan kullan
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const customerId = (req as any).auth_context?.actor_id
    if (!customerId) return res.status(401).json({ error: "Giriş yapmanız gerekiyor." })

    const parsed = RedeemSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: "Geçersiz istek.", details: parsed.error.issues })

    try {
        const loyaltyService = req.scope.resolve("loyalty") as any
        const result = await loyaltyService.redeemPoints(customerId, parsed.data.points)
        if (!result.success) return res.status(400).json({ error: result.error })
        return res.status(200).json({ discountTL: result.discountTL, success: true })
    } catch (e: any) {
        return res.status(500).json({ error: "Puan kullanılamadı." })
    }
}
