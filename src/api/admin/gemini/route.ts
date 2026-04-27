import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const apiKey = process.env.GEMINI_API_KEY
    const modelName = process.env.GEMINI_MODEL_NAME || "gemini-1.5-flash"

    if (!apiKey) {
        res.status(503).json({
            configured: false,
            model: modelName,
            message: "GEMINI_API_KEY not configured on server."
        })
        return
    }

    res.json({
        configured: true,
        model: modelName,
        exposure: "disabled"
    })
}
