import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    try {
        const id = req.params.id
        const reviewsModule = req.scope.resolve("reviews") as any
        
        const review = await reviewsModule.updateProductReviews({
            id,
            status: "approved"
        })

        return res.status(200).json({ review })
    } catch (error: any) {
        return res.status(500).json({ error: error.message })
    }
}
