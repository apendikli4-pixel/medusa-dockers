import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * DELETE /store/subscriptions/:id — iptal et
 * POST /store/subscriptions/:id/pause — duraklat/devam
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
    const customerId = (req as any).auth_context?.actor_id
    if (!customerId) return res.status(401).json({ error: "Giriş yapmanız gerekiyor." })

    const { id } = req.params
    try {
        const subscriptionService = req.scope.resolve("subscription") as any
        await subscriptionService.cancelSubscription(id, customerId)
        return res.status(200).json({ success: true })
    } catch (e: any) {
        return res.status(404).json({ error: e.message })
    }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const customerId = (req as any).auth_context?.actor_id
    if (!customerId) return res.status(401).json({ error: "Giriş yapmanız gerekiyor." })

    const { id } = req.params
    try {
        const subscriptionService = req.scope.resolve("subscription") as any
        const subscription = await subscriptionService.togglePause(id, customerId)
        return res.status(200).json({ subscription })
    } catch (e: any) {
        return res.status(404).json({ error: e.message })
    }
}
