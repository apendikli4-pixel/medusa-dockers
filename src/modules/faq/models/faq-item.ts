import { model } from "@medusajs/framework/utils"

export const FaqItem = model.define("faq_item", {
    id: model.id().primaryKey(),
    question: model.text(),
    answer: model.text(),
    sort_order: model.number().default(0),
    is_active: model.boolean().default(true),
})
