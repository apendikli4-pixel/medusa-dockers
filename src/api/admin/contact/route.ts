import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    try {
        const contactModule = req.scope.resolve("contact") as any
        
        const messages = await contactModule.listContactMessages({}, {
            order: { created_at: "DESC" }
        })

        return res.status(200).json({ messages })
    } catch (error: any) {
        return res.status(500).json({ error: error.message })
    }
}
