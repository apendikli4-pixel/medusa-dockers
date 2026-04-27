import { model } from "@medusajs/framework/utils"

export const CustomerPoints = model.define("customer_points", {
    id: model.id().primaryKey(),
    customer_id: model.text().index(),
    // earn | redeem | expire | bonus
    type: model.text(),
    points: model.number(),
    balance_after: model.number(),
    description: model.text(),
    order_id: model.text().nullable(),
    metadata: model.json().nullable(),
})
