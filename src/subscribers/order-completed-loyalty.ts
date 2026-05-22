import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { minorToMajorFloor } from "../lib/money"

/**
 * order-completed-loyalty.ts
 * Sipariş tamamlandığında müşteriye otomatik puan ver.
 *
 * Para hesaplaması: order.total Medusa V2'de BigNumber (kuruş cinsinden).
 * `lib/money.minorToMajorFloor` BigNumber-safe şekilde TL'ye çevirir —
 * raw JS division (`/ 100`) presizyon kaybedebilir, bu yüzden helper
 * kullanılır. Detay: src/lib/money.ts içindeki yorum bloku.
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

        // BigNumber-safe kuruş → TL dönüşümü (kuruş kısmı puan kazanmaz)
        const totalTL = minorToMajorFloor(order.total)
        const earned = await loyaltyService.awardOrderPoints(order.customer_id, orderId, totalTL)

        logger.info(`[Loyalty] Customer ${order.customer_id} earned ${earned} points for order ${orderId} (total: ${totalTL} TL)`)
    } catch (e: any) {
        logger.error(`[Loyalty Subscriber] Error: ${e.message}`)
    }
}

export const config: SubscriberConfig = {
    event: "order.completed",
}
