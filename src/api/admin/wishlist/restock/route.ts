import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

const RestockNotifySchema = z.object({
    product_id: z.string().min(1),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    try {
        const payload = RestockNotifySchema.parse(req.body)

        const wishlistService = req.scope.resolve("wishlist") as any
        const notificationModuleService = req.scope.resolve(Modules.NOTIFICATION) as any
        const customerModuleService = req.scope.resolve(Modules.CUSTOMER) as any

        const templateId =
            process.env.BREVO_RESTOCK_TEMPLATE_ID ||
            process.env.BREVO_ORDER_PLACED_TEMPLATE_ID ||
            "1"

        const result = await wishlistService.notifyRestockForProduct(
            payload.product_id,
            {
                notificationModuleService,
                customerModuleService,
            },
            templateId
        )

        return res.status(200).json({
            success: true,
            product_id: payload.product_id,
            notified_count: result.notifiedCount,
        })
    } catch (error: any) {
        if (error?.name === "ZodError") {
            return res.status(400).json({
                error: "Invalid request",
                details: error.issues,
            })
        }

        const logger = req.scope.resolve("logger") as any
        logger.error(`[Admin Wishlist Restock] ${error?.message || "unknown error"}`)
        return res.status(500).json({ error: "Internal server error" })
    }
}
