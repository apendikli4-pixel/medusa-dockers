import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { MODULES } from "../../../../types"
import { z } from "zod"
import { createRateLimiter, applyRateLimit } from "../../../../lib/rate-limiter"
import { RATE_LIMITS } from "../../../../config/rate-limits"

const AdminChatSchema = z.object({
    message: z.string().min(1, "Mesaj boş olamaz").max(4000, "Mesaj çok uzun"),
})

const adminChatRateLimiter = createRateLimiter(RATE_LIMITS.admin.limit)

/**
 * POST /admin/ayna/chat
 * Admin Zihni — Tüm tool'lar açık, sınırsız AI erişimi
 * Rate limit: 200 requests per 15 minutes per admin user
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    try {
        const blocked = await applyRateLimit(req, res, adminChatRateLimiter)
        if (blocked) return

        const { message } = AdminChatSchema.parse(req.body)
        const aynaService = req.scope.resolve("ayna") as any
        const logger = req.scope.resolve("logger") as any
        logger.info(`[Ayna Admin] Message received. Processing...`)

        // Defensively resolve services
        let productModuleService, inventoryService, stockLocationService, pricingModuleService, salesChannelModuleService, contentEngineService, remoteQuery
        try { productModuleService = req.scope.resolve(Modules.PRODUCT) } catch (e) { }
        try { inventoryService = req.scope.resolve(Modules.INVENTORY) } catch (e) { }
        try { stockLocationService = req.scope.resolve(Modules.STOCK_LOCATION) } catch (e) { }
        try { pricingModuleService = req.scope.resolve(Modules.PRICING) } catch (e) { }
        try { salesChannelModuleService = req.scope.resolve(Modules.SALES_CHANNEL) } catch (e) { }
        try { contentEngineService = req.scope.resolve(MODULES.CONTENT_ENGINE) } catch (e) { }
        try { remoteQuery = req.scope.resolve("remoteQuery") } catch (e) { }

        const result = await aynaService.processMessage(message, {
            isAdmin: true,
            tenantId: (req as any).tenant_id,
            customerGroup: "ADMIN",
            productModuleService,
            inventoryService,
            stockLocationService,
            pricingModuleService,
            salesChannelModuleService,
            contentEngineService,
            remoteQuery,
        })

        return res.status(200).json(result)
    } catch (error: any) {
        const logger = req.scope.resolve("logger") as any
        logger.error(`[Admin Ayna Chat] Error: ${error.message}`)

        if (error.name === "ZodError") {
            return res.status(400).json({
                error: "Geçersiz istek",
                details: error.errors,
            })
        }

        return res.status(500).json({
            error: "Internal server error",
        })
    }
}
