import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    try {
        const faqModule = req.scope.resolve("faq") as any
        
        const faqs = await faqModule.listFaqItems({ is_active: true }, {
            order: { sort_order: "ASC" }
        })

        return res.status(200).json({ faqs })
    } catch (error: any) {
        return res.status(500).json({ error: error.message })
    }
}
