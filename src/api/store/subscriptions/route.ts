import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

const CreateSubscriptionSchema = z.object({
    product_id: z.string().min(1),
    variant_id: z.string().min(1),
    frequency_days: z.number().int().min(7).max(365).optional().default(30),
    shipping_address_id: z.string().optional(),
})

/**
 * GET /store/subscriptions
 * Müşterinin aktif aboneliklerini döndürür
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const customerId = (req as any).auth_context?.actor_id
    if (!customerId) return res.status(401).json({ error: "Giriş yapmanız gerekiyor." })

    try {
        const subscriptionService = req.scope.resolve("subscription") as any
        const subscriptions = await subscriptionService.getCustomerSubscriptions(customerId)
        return res.status(200).json({ subscriptions })
    } catch (e: any) {
        return res.status(500).json({ error: "Abonelikler alınamadı." })
    }
}

/**
 * POST /store/subscriptions
 * Yeni abonelik oluşturur
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const customerId = (req as any).auth_context?.actor_id
    if (!customerId) return res.status(401).json({ error: "Giriş yapmanız gerekiyor." })

    const parsed = CreateSubscriptionSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: "Geçersiz istek.", details: parsed.error.issues })

    try {
        const subscriptionService = req.scope.resolve("subscription") as any
        const subscription = await subscriptionService.createSubscription({
            customer_id: customerId,
            product_id: parsed.data.product_id,
            variant_id: parsed.data.variant_id,
            frequency_days: parsed.data.frequency_days,
            shipping_address_id: parsed.data.shipping_address_id,
        })
        return res.status(201).json({ subscription })
    } catch (e: any) {
        const logger = req.scope.resolve("logger") as any
        logger.error(`[Subscription POST] Error: ${e.message}`)
        return res.status(500).json({ error: "Abonelik oluşturulamadı." })
    }
}
