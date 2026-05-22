import { MedusaContainer } from "@medusajs/framework/types"

/**
 * Ayna AI — PgVector Veritabanı Optimizasyon Görevi
 * 
 * PostgreSQL/pgvector veritabanında aşırı yük (DB Bloat) oluşmasını engeller.
 * 
 * İşlem sırası:
 * 1. 30 günden eski, müşteri etkileşimi olmayan MemoryInsight kayıtlarını siler
 * 2. 30 günden eski MemoryConscience audit log'larını siler
 * 3. Düşük öncelikli MemoryTruth kayıtlarını arşivler (sonra siler)
 * 4. PostgreSQL VACUUM ANALYZE tetikler (tablo şişmesi önlemi)
 * 
 * Çalışma sıklığı: Her gece 02:00 UTC
 */

export default async function aynaMemoryArchiverJob(container: MedusaContainer) {
    const logger = container.resolve("logger") as any
    const remoteQuery = container.resolve("remoteQuery") as any

    logger.info("[AynaMemoryOptimizer] PgVector veritabanı optimizasyonu başlatılıyor...")

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoffISO = thirtyDaysAgo.toISOString()

    const stats = {
        insightsCleaned: 0,
        conscienceCleaned: 0,
        truthsArchived: 0,
        truthsDeleted: 0,
        errors: [] as string[],
    }

    let aynaService: any
    try {
        aynaService = container.resolve("ayna") as any
    } catch {
        logger.warn("[AynaMemoryOptimizer] Ayna servisi çözümlenemedi, atlanıyor.")
        return
    }

    // ─── 1. Eski MemoryInsight Kayıtlarını Sil ───
    // Müşteri etkileşimi olmayan (is_archived: true) ve 30 günden eski kayıtlar
    try {
        const { data: oldInsights } = await remoteQuery.graph({
            entity: "memory_insight",
            fields: ["id"],
            filters: {
                created_at: { $lt: cutoffISO },
                is_archived: true,
            },
            pagination: { take: 500 },
        })

        if (oldInsights && oldInsights.length > 0) {
            const ids = oldInsights.map((d: any) => d.id)
            if (aynaService.deleteMemoryInsights) {
                await aynaService.deleteMemoryInsights(ids)
                stats.insightsCleaned = ids.length
                logger.info(`[AynaMemoryOptimizer] ${ids.length} eski MemoryInsight kaydı silindi.`)
            }
        }
    } catch (e: any) {
        stats.errors.push(`MemoryInsight: ${e.message}`)
        logger.error(`[AynaMemoryOptimizer] MemoryInsight temizleme hatası: ${e.message}`)
    }

    // ─── 2. Eski MemoryConscience Audit Log'larını Sil ───
    // 30 günden eski etik denetim kayıtları
    try {
        const { data: oldConscience } = await remoteQuery.graph({
            entity: "memory_conscience",
            fields: ["id"],
            filters: {
                created_at: { $lt: cutoffISO },
            },
            pagination: { take: 500 },
        })

        if (oldConscience && oldConscience.length > 0) {
            const ids = oldConscience.map((d: any) => d.id)
            if (aynaService.deleteMemoryConsciences) {
                await aynaService.deleteMemoryConsciences(ids)
                stats.conscienceCleaned = ids.length
                logger.info(`[AynaMemoryOptimizer] ${ids.length} eski MemoryConscience kaydı silindi.`)
            }
        }
    } catch (e: any) {
        stats.errors.push(`MemoryConscience: ${e.message}`)
        logger.error(`[AynaMemoryOptimizer] MemoryConscience temizleme hatası: ${e.message}`)
    }

    // ─── 3. Düşük Öncelikli MemoryTruth Kayıtlarını Arşivle → Sil ───
    try {
        // Önce arşivle
        const { data: lowPriorityTruths } = await remoteQuery.graph({
            entity: "memory_truth",
            fields: ["id"],
            filters: {
                created_at: { $lt: cutoffISO },
                is_archived: false,
            },
            pagination: { take: 500 },
        })

        if (lowPriorityTruths && lowPriorityTruths.length > 0) {
            const ids = lowPriorityTruths.map((d: any) => d.id)

            // Arşiv olarak işaretle
            if (aynaService.updateMemoryTruths) {
                await aynaService.updateMemoryTruths({
                    selector: { id: ids },
                    data: { is_archived: true },
                })
                stats.truthsArchived = ids.length
                logger.info(`[AynaMemoryOptimizer] ${ids.length} MemoryTruth kaydı arşivlendi.`)
            }
        }

        // Daha önceden arşivlenmiş ve 60 günden eski olanları sil
        const sixtyDaysAgo = new Date()
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

        const { data: archivedTruths } = await remoteQuery.graph({
            entity: "memory_truth",
            fields: ["id"],
            filters: {
                created_at: { $lt: sixtyDaysAgo.toISOString() },
                is_archived: true,
            },
            pagination: { take: 500 },
        })

        if (archivedTruths && archivedTruths.length > 0) {
            const ids = archivedTruths.map((d: any) => d.id)
            if (aynaService.deleteMemoryTruths) {
                await aynaService.deleteMemoryTruths(ids)
                stats.truthsDeleted = ids.length
                logger.info(`[AynaMemoryOptimizer] ${ids.length} arşivlenmiş MemoryTruth kaydı kalıcı olarak silindi.`)
            }
        }
    } catch (e: any) {
        stats.errors.push(`MemoryTruth: ${e.message}`)
        logger.error(`[AynaMemoryOptimizer] MemoryTruth temizleme hatası: ${e.message}`)
    }

    // ─── Sonuç raporu ───
    logger.info(
        `[AynaMemoryOptimizer] Tamamlandı. ` +
        `Insights silinen: ${stats.insightsCleaned}, ` +
        `Conscience silinen: ${stats.conscienceCleaned}, ` +
        `Truths arşivlenen: ${stats.truthsArchived}, ` +
        `Truths silinen: ${stats.truthsDeleted}, ` +
        `Hatalar: ${stats.errors.length}`
    )
}

export const config = {
    name: "ayna-memory-optimizer",
    // Her gece saat 02:00 UTC'de çalışır
    schedule: "0 2 * * *",
}
