import { model } from "@medusajs/framework/utils"

export const ProductReview = model.define("product_review", {
    id: model.id().primaryKey(),
    product_id: model.text().index(),
    customer_id: model.text().index(),
    rating: model.number(), // 1 to 5
    title: model.text().nullable(),
    content: model.text(),
    is_verified_purchase: model.boolean().default(false),
    status: model.enum(["pending", "approved", "rejected"]).default("pending"),
})
