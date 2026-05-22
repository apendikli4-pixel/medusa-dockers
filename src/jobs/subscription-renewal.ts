import { MedusaContainer } from "@medusajs/framework/types"

/**
 * SubscriptionRenewalJob
 *
 * Her gün vadesi gelen aktif abonelikleri kontrol eder.
 * Vadesi gelen her abonelik için:
 *   1. Müşteriye bildirim gönderir
 *   2. next_renewal_at tarihini frequency_days kadar ileri atar
 *   3. Truth log'a kaydeder (Ayna hafıza)
 *
 * NOT: Otomatik sipariş oluşturma şimdilik devre dışıdır.
 * Müşteriye "aboneliğiniz yenilenecek" bildirimi gider,
 * müşteri onaylarsa sipariş oluşturulur. (checkout-free flow ileride eklenebilir)
 */
export default async function subscriptionRenewalJob(container: MedusaContainer) {
    const logger = container.resolve("logger") as any
    const subscriptionService = container.resolve("subscription") as any
    const notificationService = container.resolve("notification") as any

    let aynaService: any = null
    try { aynaService = container.resolve("ayna") } catch { /* optional */ }

    logger.info("[Subscription] Renewal check started.")

    try {
        // 1. Vadesi gelen abonelikleri bul
        const dueSubscriptions = await subscriptionService.getDueSubscriptions()

        if (!dueSubscriptions || dueSubscriptions.length === 0) {
            logger.info("[Subscription] No subscriptions due for renewal.")
            return
        }

        logger.info(`[Subscription] Found ${dueSubscriptions.length} due subscription(s).`)

        let renewed = 0
        let failed = 0

        for (const sub of dueSubscriptions) {
            try {
                // 2. next_renewal_at tarihini ileri at
                const nextDate = new Date()
                nextDate.setDate(nextDate.getDate() + (sub.frequency_days || 30))

                await subscriptionService.updateSubscriptions({
                    selector: { id: sub.id },
                    data: { next_renewal_at: nextDate },
                })

                // 3. Müşteriye bildirim gönder
                try {
                    // Customer email'ini bul
                    const remoteQuery = container.resolve("remoteQuery") as any
                    const { data: customers } = await remoteQuery.graph({
                        entity: "customer",
                        fields: ["id", "email", "first_name"],
                        filters: { id: sub.customer_id },
                    })

                    const customer = customers?.[0]
                    if (customer?.email) {
                        await notificationService.createNotifications({
                            to: customer.email,
                            channel: "email",
                            template: process.env.BREVO_SUBSCRIPTION_RENEWAL_TEMPLATE_ID || "2",
                            data: {
                                customer_name: customer.first_name || "Değerli Müşterimiz",
                                product_id: sub.product_id,
                                next_renewal: nextDate.toLocaleDateString("tr-TR"),
                                frequency_days: sub.frequency_days,
                                discount_percentage: sub.discount_percentage || 10,
                            },
                        })
                    }
                } catch (notifErr: any) {
                    logger.warn(`[Subscription] Notification failed for ${sub.id}: ${notifErr.message}`)
                    // Notification failure should not block renewal
                }

                // 4. Truth log
                if (aynaService) {
                    try {
                        await aynaService.recordTruth("system", "subscription_renewed", {
                            subscriptionId: sub.id,
                            customerId: sub.customer_id,
                            productId: sub.product_id,
                            nextRenewal: nextDate.toISOString(),
                        })
                    } catch { /* truth log failure is non-critical */ }
                }

                renewed++
            } catch (subErr: any) {
                logger.error(`[Subscription] Renewal failed for ${sub.id}: ${subErr.message}`)
                failed++
            }
        }

        logger.info(`[Subscription] Renewal completed. Renewed: ${renewed}, Failed: ${failed}`)
    } catch (err: any) {
        logger.error(`[Subscription] Renewal job failure: ${err.message}`)
    }
}

export const config = {
    name: "subscription-renewal-job",
    schedule: "0 8 * * *", // Her gün sabah 08:00'de
}
