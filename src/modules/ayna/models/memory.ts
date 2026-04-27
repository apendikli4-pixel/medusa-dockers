import { model } from "@medusajs/framework/utils"

export const MemoryTruth = model.define("memory_truth", {
    id: model.id().primaryKey(),
    entity_id: model.text().index(), // customer_id or other
    content: model.text(),
    is_archived: model.boolean().default(false),
    importance: model.number().default(1),
    metadata: model.json().nullable(),
})

export const MemoryInsight = model.define("memory_insight", {
    id: model.id().primaryKey(),
    entity_id: model.text().index(),
    content: model.text(),
    is_archived: model.boolean().default(false),
    metadata: model.json().nullable(),
})

export const MemoryConscience = model.define("memory_conscience", {
    id: model.id().primaryKey(),
    entity_id: model.text().index(),
    action_type: model.text(),
    impact: model.text(),
    timestamp: model.dateTime(),
})
