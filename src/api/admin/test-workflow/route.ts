import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const logger = req.scope.resolve("logger") as any

    logger.info("Test workflow endpoint called.")

    res.json({
        success: true,
        message: "Test workflow endpoint is healthy. No workflow configured yet.",
        timestamp: new Date().toISOString()
    })
}
