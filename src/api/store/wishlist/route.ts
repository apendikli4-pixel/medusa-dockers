import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"

const AddWishlistSchema = z.object({
    product_id: z.string().min(1, "product_id gerekli"),
    notify_on_restock: z.boolean().optional().default(true),
})

/**
 * GET /store/wishlist
 * Müşterinin favoriler listesini döndürür
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    try {
        const customerId = (req as any).auth_context?.actor_id
        if (!customerId) {
            return res.status(401).json({ error: "Giriş yapmanız gerekiyor." })
        }

        const wishlistService = req.scope.resolve("wishlist") as any
        const items = await wishlistService.listWishlistItems({ customer_id: customerId })

        return res.status(200).json({ wishlist: items })
    } catch (error: any) {
        const logger = req.scope.resolve("logger") as any
        logger.error(`[Wishlist GET] Error: ${error.message}`)
        return res.status(500).json({ error: "Favoriler alınamadı." })
    }
}

/**
 * POST /store/wishlist
 * Ürünü favorilere ekler
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    try {
        const customerId = (req as any).auth_context?.actor_id
        if (!customerId) {
            return res.status(401).json({ error: "Giriş yapmanız gerekiyor." })
        }

        const parsed = AddWishlistSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ error: "Geçersiz istek.", details: parsed.error.errors })
        }

        const wishlistService = req.scope.resolve("wishlist") as any
        const item = await wishlistService.upsertWishlistItem({
            customer_id: customerId,
            product_id: parsed.data.product_id,
            notify_on_restock: parsed.data.notify_on_restock,
        })

        return res.status(201).json({ item })
    } catch (error: any) {
        const logger = req.scope.resolve("logger") as any
        logger.error(`[Wishlist POST] Error: ${error.message}`)
        return res.status(500).json({ error: "Favorilere eklenemedi." })
    }
}
