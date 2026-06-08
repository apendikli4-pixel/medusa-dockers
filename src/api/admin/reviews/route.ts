import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    try {
        const reviewsModule = req.scope.resolve("reviews") as any
        
        const reviews = await reviewsModule.listProductReviews({}, {
            order: { created_at: "DESC" }
        })

        return res.status(200).json({ reviews })
    } catch (error: any) {
        return res.status(500).json({ error: error.message })
    }
}
