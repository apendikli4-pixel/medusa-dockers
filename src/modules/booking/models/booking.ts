import { model } from "@medusajs/framework/utils"

export const Booking = model.define("booking", {
    id: model.id().primaryKey(),
    tenant_id: model.text(),
    product_id: model.text(),
    variant_id: model.text().nullable(),
    customer_id: model.text().nullable(),
    order_id: model.text().nullable(),
    
    // YYYY-MM-DD formatında saklanması en güvenlisidir.
    start_date: model.dateTime(),
    end_date: model.dateTime(),
    
    // pending, confirmed, cancelled
    status: model.text().default("pending"),
    
    notes: model.text().nullable(),
    metadata: model.json().nullable()
})
