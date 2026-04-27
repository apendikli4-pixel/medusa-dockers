import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const logger = req.scope.resolve("logger")
    try {
        const notificationModuleService = req.scope.resolve("notification")

        logger.info("Triggering Brevo test via API route...")

        const result = await notificationModuleService.createNotifications({
            to: process.env.BREVO_FROM_EMAIL || "test@aquahavuz.com",
            channel: "email",
            template: "test-template-id",
            data: {
                test: true,
                message: "This is a test from the Ayna platform."
            },
        })

        return res.json({
            success: true,
            message: "Notification triggered successfully.",
            data: result
        })
    } catch (e: any) {
        logger.error("API test notification failed: " + e.message)
        return res.status(500).json({
            success: false,
            error: e.message
        })
    }
}
