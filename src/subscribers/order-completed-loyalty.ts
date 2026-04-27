import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

/**
 * order-completed-loyalty.ts
 * Sipariş tamamlandığında müşteriye otomatik puan ver.
 */
export default async function orderCompletedLoyaltySubscriber({
    event,
    container,
}: SubscriberArgs<{ id: string }>) {
    const logger = container.resolve("logger") as any

    try {
        const orderId = event.data.id
        const loyaltyService = container.resolve("loyalty") as any
        const remoteQuery = container.resolve("remoteQuery") as any

        const { data: orders } = await remoteQuery.graph({
            entity: "order",
            fields: ["id", "customer_id", "total", "currency_code"],
            filters: { id: orderId },
        })

        const order = orders?.[0]
        if (!order || !order.customer_id) {
            logger.warn(`[Loyalty] No customer for order ${orderId}`)
            return
        }

        // Total is in smallest unit (kuruş/cents) → convert to TL
        const totalTL = Math.floor((order.total || 0) / 100)
        const earned = await loyaltyService.awardOrderPoints(order.customer_id, orderId, totalTL)

        logger.info(`[Loyalty] Customer ${order.customer_id} earned ${earned} points for order ${orderId}`)
    } catch (e: any) {
        logger.error(`[Loyalty Subscriber] Error: ${e.message}`)
    }
}

export const config: SubscriberConfig = {
    event: "order.completed",
}
