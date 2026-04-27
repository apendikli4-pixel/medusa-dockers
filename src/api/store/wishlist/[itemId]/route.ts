import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * DELETE /store/wishlist/:itemId
 * Favori öğeyi kaldırır
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
    try {
        const customerId = (req as any).auth_context?.actor_id
        if (!customerId) {
            return res.status(401).json({ error: "Giriş yapmanız gerekiyor." })
        }

        const { itemId } = req.params
        const wishlistService = req.scope.resolve("wishlist") as any
        const success = await wishlistService.removeCustomerWishlistItem(customerId, itemId)

        if (!success) {
            return res.status(404).json({ error: "Favori öğe bulunamadı." })
        }

        return res.status(200).json({ success: true })
    } catch (error: any) {
        const logger = req.scope.resolve("logger") as any
        logger.error(`[Wishlist DELETE] Error: ${error.message}`)
        return res.status(500).json({ error: "Favori kaldırılamadı." })
    }
}
