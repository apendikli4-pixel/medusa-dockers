import { model } from "@medusajs/framework/utils"

export const Mission = model.define("mission", {
    id: model.id().primaryKey(),
    title: model.text(),
    description: model.text().nullable(),
    status: model.enum(["pending", "in_progress", "completed", "failed"]).default("pending"),
    priority: model.enum(["low", "medium", "high", "critical"]).default("medium"),
    assigned_to: model.text().nullable(), // customer_id or "system"
    created_by: model.text().default("ayna"), // who created the mission
    result: model.json().nullable(), // mission outcome data
    metadata: model.json().nullable(),
})
