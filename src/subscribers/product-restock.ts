import { SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export default async function productRestockHandler({ event: { data }, container }: any) {
    const logger = container.resolve("logger")

    try {
        const wishlistService = container.resolve("wishlist") as any
        const notificationModuleService = container.resolve(Modules.NOTIFICATION) as any
        const customerModuleService = container.resolve(Modules.CUSTOMER) as any

        const templateId =
            process.env.BREVO_RESTOCK_TEMPLATE_ID ||
            process.env.BREVO_ORDER_PLACED_TEMPLATE_ID ||
            "1"

        const productId = data?.id
        if (!productId) {
            return
        }

        const result = await wishlistService.notifyRestockForProduct(
            productId,
            {
                notificationModuleService,
                customerModuleService,
            },
            templateId
        )

        if (result.notifiedCount > 0) {
            logger.info(
                `[Wishlist Restock] Product ${productId} icin ${result.notifiedCount} kullaniciya bildirim gonderildi.`
            )
        }
    } catch (error: any) {
        logger.error(`[Wishlist Restock] ${error?.message || "unknown error"}`)
    }
}

export const config: SubscriberConfig = {
    event: ["product.updated"],
}
