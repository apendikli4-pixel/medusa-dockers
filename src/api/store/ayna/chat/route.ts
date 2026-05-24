import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { createRateLimiter, applyRateLimit } from "../../../../lib/rate-limiter"
import { RATE_LIMITS } from "../../../../config/rate-limits"

const storeChatRateLimiter = createRateLimiter(RATE_LIMITS.storeAynaChat.limit)

const ChatRequestSchema = z.object({
    message: z.string().min(1, "Mesaj boş olamaz"),
    image: z.string().optional()
})

/**
 * POST /store/ayna/chat
 * Müşteri AI chat endpoint'i
 * Rate limit: 20 requests per 15 minutes per user or IP
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    try {
        const blocked = await applyRateLimit(req, res, storeChatRateLimiter)
        if (blocked) return

        const aynaService = req.scope.resolve("ayna") as any
        
        // 1. Zod validation (filters harmful data)
        const parsedBody = ChatRequestSchema.parse(req.body)
        const { message, image } = parsedBody

        // 2. Safe identity and customer group detection
        let customerId: string | undefined = undefined;
        let customerGroup: string = "B2C_Retail"; // Default group

        // auth_context: Medusa's JWT/session verified object
        if ((req as any).auth_context && (req as any).auth_context.actor_id) {
            customerId = (req as any).auth_context.actor_id

            try {
                const customerModuleService = req.scope.resolve(Modules.CUSTOMER) as any
                const customer = await customerModuleService.retrieveCustomer(customerId, {
                    relations: ["groups"]
                })
                
                if (customer && customer.groups && customer.groups.length > 0) {
                    // Enforce the real group they're authorized for
                    customerGroup = customer.groups[0].name || customerGroup;
                }
            } catch (e) {
                // If group or customer not found, "B2C_Retail" default persists
            }
        }

        let productModuleService, inventoryService, remoteQuery
        try { productModuleService = req.scope.resolve(Modules.PRODUCT) } catch (e) {}
        try { inventoryService = req.scope.resolve(Modules.INVENTORY) } catch (e) {}
        try { remoteQuery = req.scope.resolve("remoteQuery") } catch (e) {}

        const result = await aynaService.processMessage(message, {
            customerId,
            customerGroup,
            image,
            isAdmin: false,
            tenantId: (req as any).tenant_id,
            productModuleService,
            inventoryService,
            remoteQuery,
        })

        return res.status(200).json(result)
    } catch (error: any) {
        const logger = req.scope.resolve("logger") as any
        logger.error(`[Store Ayna Chat] Error: ${error.message}`)

        if (error instanceof z.ZodError || error.name === "ZodError") {
            return res.status(400).json({
                error: "Geçersiz istek",
                details: error.issues,
            })
        }

        return res.status(200).json({
            response: "Şu an teknik bakım yapılıyor. Lütfen birkaç dakika sonra tekrar deneyin.",
        })
    }
}
