import { MedusaService } from "@medusajs/framework/utils"
import { Subscription } from "./models/subscription"

export default class SubscriptionService extends MedusaService({
    Subscription,
}) {
    /**
     * Müşteri için aktif abonelikleri listele
     */
    async getCustomerSubscriptions(customerId: string) {
        return this.listSubscriptions({ customer_id: customerId, status: "active" })
    }

    /**
     * Yenilenmesi gereken aktif abonelikleri bul
     */
    async getDueSubscriptions() {
        const now = new Date()
        const allActive = await this.listSubscriptions({ status: "active" })
        return allActive.filter((s: any) => new Date(s.next_renewal_at) <= now)
    }

    /**
     * Abonelik oluştur veya güncelle
     */
    async createSubscription(input: {
        customer_id: string
        product_id: string
        variant_id: string
        frequency_days?: number
        shipping_address_id?: string
    }) {
        // Müşterinin aynı ürün için zaten aboneliği var mı kontrol et
        const [existing] = await this.listSubscriptions({
            customer_id: input.customer_id,
            product_id: input.product_id,
            status: "active",
        }, { take: 1 })

        if (existing) {
            // Mevcut aboneliği güncelle
            return this.updateSubscriptions({
                selector: { id: (existing as any).id },
                data: {
                    frequency_days: input.frequency_days || 30,
                    status: "active",
                }
            })
        }

        const nextRenewal = new Date()
        nextRenewal.setDate(nextRenewal.getDate() + (input.frequency_days || 30))

        return this.createSubscriptions({
            customer_id: input.customer_id,
            product_id: input.product_id,
            variant_id: input.variant_id,
            frequency_days: input.frequency_days || 30,
            next_renewal_at: nextRenewal,
            status: "active",
            shipping_address_id: input.shipping_address_id || null,
        })
    }

    /**
     * İptal et
     */
    async cancelSubscription(subscriptionId: string, customerId: string) {
        const [sub] = await this.listSubscriptions({
            id: subscriptionId,
            customer_id: customerId,
        }, { take: 1 })

        if (!sub) throw new Error("Abonelik bulunamadı.")

        return this.updateSubscriptions({
            selector: { id: subscriptionId },
            data: { status: "cancelled" }
        })
    }

    /**
     * Duraklat / devam ettir
     */
    async togglePause(subscriptionId: string, customerId: string) {
        const [sub] = await this.listSubscriptions({
            id: subscriptionId,
            customer_id: customerId,
        }, { take: 1 }) as any[]

        if (!sub) throw new Error("Abonelik bulunamadı.")

        const newStatus = sub.status === "paused" ? "active" : "paused"
        return this.updateSubscriptions({
            selector: { id: subscriptionId },
            data: { status: newStatus }
        })
    }
}
