import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * DELETE /store/wishlist/:itemId
 * Favori öğeyi kaldırır
 *
 * GÜVENLİK: Ownership kontrolü — müşteri yalnızca kendi wishlist
 * öğesini silebilir. Başka müşterinin itemId'si ile çağrılırsa 404 döner.
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
    try {
        const customerId = (req as any).auth_context?.actor_id
        if (!customerId) {
            return res.status(401).json({ error: "Giriş yapmanız gerekiyor." })
        }

        const { itemId } = req.params
        if (!itemId || typeof itemId !== "string") {
            return res.status(400).json({ error: "Geçersiz öğe ID'si." })
        }

        const wishlistService = req.scope.resolve("wishlist") as any

        // IDOR koruması: Önce öğenin varlığını ve sahipliğini doğrula
        try {
            const items = await wishlistService.listWishlistItems({
                id: itemId,
                customer_id: customerId,
            })
            if (!items || items.length === 0) {
                return res.status(404).json({ error: "Favori öğe bulunamadı." })
            }
        } catch {
            return res.status(404).json({ error: "Favori öğe bulunamadı." })
        }

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
