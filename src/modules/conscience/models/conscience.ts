import { model } from "@medusajs/framework/utils"

export const ConscienceSettings = model.define("conscience_settings", {
    id: model.id().primaryKey(),
    customer_id: model.text().unique(),
    monthly_limit: model.number().default(0),
    current_spending: model.number().default(0),
    is_active: model.boolean().default(true),
    preferences: model.json().nullable(),
})

export const ConscienceLog = model.define("conscience_log", {
    id: model.id().primaryKey(),
    customer_id: model.text().index(),
    level: model.text(), // 'info', 'warning', 'critical'
    message: model.text(),
    metadata: model.json().nullable(),
})
