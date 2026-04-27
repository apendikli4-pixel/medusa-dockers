import { MedusaService } from "@medusajs/framework/utils"
import { WishlistItem } from "./models/wishlist-item"

type RestockServices = {
    notificationModuleService: any
    customerModuleService: any
}

export default class WishlistService extends MedusaService({
    WishlistItem,
}) {
    static identifier = "wishlist"

    async upsertWishlistItem(input: {
        customer_id: string
        product_id: string
        notify_on_restock?: boolean
    }) {
        const [existing] = await this.listWishlistItems(
            {
                customer_id: input.customer_id,
                product_id: input.product_id,
            },
            {
                take: 1,
            }
        )

        if (existing) {
            const updates: any = {
                id: existing.id,
                notify_on_restock: input.notify_on_restock ?? existing.notify_on_restock,
                restock_notified_at: null,
            }

            const updated = await this.updateWishlistItems([updates])
            return Array.isArray(updated) ? updated[0] : updated
        }

        return this.createWishlistItems({
            customer_id: input.customer_id,
            product_id: input.product_id,
            notify_on_restock: input.notify_on_restock ?? true,
            restock_notified_at: null,
        })
    }

    async removeCustomerWishlistItem(customerId: string, itemId: string) {
        const [item] = await this.listWishlistItems(
            {
                id: itemId,
                customer_id: customerId,
            },
            {
                take: 1,
            }
        )

        if (!item) {
            return false
        }

        await this.deleteWishlistItems([itemId])
        return true
    }

    async notifyRestockForProduct(
        productId: string,
        services: RestockServices,
        templateId: string
    ): Promise<{ notifiedCount: number }> {
        const pendingItems = await this.listWishlistItems({
            product_id: productId,
            notify_on_restock: true,
            restock_notified_at: null,
        })

        let notifiedCount = 0

        for (const item of pendingItems) {
            const customer = await services.customerModuleService
                .retrieveCustomer(item.customer_id)
                .catch(() => null)

            if (!customer?.email) {
                continue
            }

            await services.notificationModuleService.createNotifications({
                to: customer.email,
                channel: "email",
                template: templateId,
                data: {
                    product_id: productId,
                    customer_id: item.customer_id,
                },
            })

            await this.updateWishlistItems([
                {
                    id: item.id,
                    restock_notified_at: new Date(),
                },
            ])

            notifiedCount += 1
        }

        return { notifiedCount }
    }
}
