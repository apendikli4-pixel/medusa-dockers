import { model } from "@medusajs/framework/utils"

export const Subscription = model.define("subscription", {
    id: model.id().primaryKey(),
    customer_id: model.text().index(),
    product_id: model.text(),
    variant_id: model.text(),
    // Kaç günde bir yenilensin: 7, 14, 30, 60, 90
    frequency_days: model.number().default(30),
    // Sonraki yenileme tarihi
    next_renewal_at: model.dateTime(),
    // active | paused | cancelled
    status: model.text().default("active"),
    // Ses geçmişi için son başarılı sipariş
    last_order_id: model.text().nullable(),
    // Müşterinin teslimat adresi ID'si
    shipping_address_id: model.text().nullable(),
    // İndirim yüzdesi (abonelik avantajı)
    discount_percentage: model.number().default(10),
})
