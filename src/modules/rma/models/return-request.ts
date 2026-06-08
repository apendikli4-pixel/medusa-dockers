import { model } from "@medusajs/framework/utils"

export const ReturnRequest = model.define("return_request", {
    id: model.id().primaryKey(),
    order_id: model.text(), // display_id
    email: model.text(),
    reason: model.text(),
    status: model.enum(["pending", "approved", "rejected", "received"]).default("pending"),
})
