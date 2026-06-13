/**
 * Ayna 3-Katmanlı Hafıza Modeli — DEĞİŞMEZ olay günlüğü.
 * Supreme Law MADDE 6.1: MemoryTruth/Insight/Conscience asla doğrudan SİLİNMEZ;
 * yumuşak işaret (is_archived) kullanılır. Tek meşru sert-silme: arşivleyici cron
 * (src/jobs/ayna-memory-archiver.ts). Şema değişikliği migration gerektirir.
 * @sealed  — değişiklik için: npm run audit:seal + 08_ARCHITECTURE_SEAL.md güncelle
 */
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
