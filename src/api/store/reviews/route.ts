import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

const CreateReviewSchema = z.object({
    product_id: z.string(),
    rating: z.number().min(1).max(5),
    title: z.string().optional(),
    content: z.string().min(5),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    try {
        const body = CreateReviewSchema.parse(req.body)
        
        let customerId: string | undefined = undefined;
        if ((req as any).auth_context && (req as any).auth_context.actor_id) {
            customerId = (req as any).auth_context.actor_id
        }

        if (!customerId) {
            return res.status(401).json({ error: "Giriş yapmanız gerekiyor." })
        }

        let isVerifiedPurchase = false
        const remoteQuery = req.scope.resolve("remoteQuery") as any
        
        try {
            const { data: orders } = await remoteQuery.graph({
                entity: "order",
                // audit-ignore: store-tenant-scope — auth-scoped: müşterinin KENDİ siparişleri (verified-purchase kontrolü); cross-tenant sızıntı yok
                fields: ["id", "items.product_id", "items.variant.product_id"],
                filters: { customer_id: customerId }
            })
            
            for (const order of orders) {
                if (order.items && Array.isArray(order.items)) {
                    for (const item of order.items) {
                        if (item.product_id === body.product_id || (item.variant && item.variant.product_id === body.product_id)) {
                            isVerifiedPurchase = true
                            break
                        }
                    }
                }
                if (isVerifiedPurchase) break
            }
        } catch (e) {
            const logger = req.scope.resolve("logger") as any
            logger.warn(`[Reviews] Order check failed for customer ${customerId}: ${e}`)
        }

        const reviewsModule = req.scope.resolve("reviews") as any
        
        const review = await reviewsModule.createProductReviews({
            product_id: body.product_id,
            customer_id: customerId,
            rating: body.rating,
            title: body.title,
            content: body.content,
            is_verified_purchase: isVerifiedPurchase,
            status: "pending",
        })

        return res.status(200).json({ review })
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: "Geçersiz istek", details: error.issues })
        }
        return res.status(500).json({ error: error.message })
    }
}
