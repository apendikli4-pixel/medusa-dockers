
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { setupB2BTierWorkflow } from "../../../workflows/setup-b2b-tier"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    try {
        const { result } = await setupB2BTierWorkflow(req.scope).run({
            input: {}
        })

        res.json({
            message: "B2B Tier setup completed successfully",
            result
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error"
        console.error("B2B Setup Failed:", error)
        res.status(500).json({
            message: "Failed to setup B2B Tier",
            error: "İşlem sırasında bir hata oluştu."
        })
    }
}
