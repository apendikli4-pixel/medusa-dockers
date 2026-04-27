import { model } from "@medusajs/framework/utils"

export const WishlistItem = model.define("wishlist_item", {
    id: model.id().primaryKey(),
    customer_id: model.text().index(),
    product_id: model.text().index(),
    notify_on_restock: model.boolean().default(true),
    restock_notified_at: model.dateTime().nullable(),
})
