import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    try {
        const productId = req.params.id
        const reviewsModule = req.scope.resolve("reviews") as any
        
        const reviews = await reviewsModule.listProductReviews({
            product_id: productId,
            status: "approved"
        })

        // Mask customer IDs in the public response
        const publicReviews = reviews.map((r: any) => ({
            id: r.id,
            rating: r.rating,
            title: r.title,
            content: r.content,
            is_verified_purchase: r.is_verified_purchase,
            created_at: r.created_at,
            // Mask the customer ID to look like user_*** 
            customer_name: r.customer_id ? `Müşteri_${r.customer_id.substring(r.customer_id.length - 4)}` : "Anonim"
        }))

        return res.status(200).json({ reviews: publicReviews })
    } catch (error: any) {
        return res.status(500).json({ error: error.message })
    }
}
