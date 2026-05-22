import { MedusaContainer } from "@medusajs/framework/types"

/**
 * Yetim Veri Temizleyicisi — Zamanlanmış Görev (Cron Job)
 * 
 * Medusa V2'nin modüler izolasyon mimarisinde tablolar arası fiziksel
 * foreign key bulunmaz. Bu nedenle zamanla link tabloları ile kaynak
 * tablolar arasında eşleşmeyen "yetim" (orphan) kayıtlar oluşabilir.
 * 
 * Bu iş akışı:
 * 1. src/links altındaki modül bağlantılarını tarar
 * 2. Referansı silinmiş asılı kayıtları tespit eder
 * 3. Güvenli bir şekilde temizler ve loglar
 * 
 * Çalışma sıklığı: Günde 1 kez (03:00 UTC)
 */

export default async function orphanDataCleanupJob(container: MedusaContainer) {
    const logger = container.resolve("logger") as any
    const remoteQuery = container.resolve("remoteQuery") as any
    const remoteLink = container.resolve("remoteLink") as any

    logger.info("[OrphanCleanup] Yetim veri taraması başlatılıyor...")

    const results = {
        totalScanned: 0,
        totalCleaned: 0,
        errors: [] as string[],
        details: {} as Record<string, { scanned: number; cleaned: number }>,
    }

    // ─── 1. Tenant-Product yetim bağlantıları ───
    try {
        const { cleaned, scanned } = await cleanOrphanLinks({
            remoteQuery,
            remoteLink,
            logger,
            linkEntity: "tenant_product",
            sourceEntity: "product",
            sourceField: "product_id",
            sourceIdField: "id",
            linkName: "Tenant-Product",
        })
        results.details["tenant_product"] = { scanned, cleaned }
        results.totalScanned += scanned
        results.totalCleaned += cleaned
    } catch (e: any) {
        results.errors.push(`tenant_product: ${e.message}`)
        logger.error(`[OrphanCleanup] Tenant-Product taraması başarısız: ${e.message}`)
    }

    // ─── 2. Tenant-Order yetim bağlantıları ───
    try {
        const { cleaned, scanned } = await cleanOrphanLinks({
            remoteQuery,
            remoteLink,
            logger,
            linkEntity: "tenant_order",
            sourceEntity: "order",
            sourceField: "order_id",
            sourceIdField: "id",
            linkName: "Tenant-Order",
        })
        results.details["tenant_order"] = { scanned, cleaned }
        results.totalScanned += scanned
        results.totalCleaned += cleaned
    } catch (e: any) {
        results.errors.push(`tenant_order: ${e.message}`)
        logger.error(`[OrphanCleanup] Tenant-Order taraması başarısız: ${e.message}`)
    }

    // ─── 3. Tenant-Customer yetim bağlantıları ───
    try {
        const { cleaned, scanned } = await cleanOrphanLinks({
            remoteQuery,
            remoteLink,
            logger,
            linkEntity: "tenant_customer",
            sourceEntity: "customer",
            sourceField: "customer_id",
            sourceIdField: "id",
            linkName: "Tenant-Customer",
        })
        results.details["tenant_customer"] = { scanned, cleaned }
        results.totalScanned += scanned
        results.totalCleaned += cleaned
    } catch (e: any) {
        results.errors.push(`tenant_customer: ${e.message}`)
        logger.error(`[OrphanCleanup] Tenant-Customer taraması başarısız: ${e.message}`)
    }

    // ─── 4. Ayna Memory-Customer yetim bağlantıları ───
    try {
        const { cleaned, scanned } = await cleanOrphanLinks({
            remoteQuery,
            remoteLink,
            logger,
            linkEntity: "customer_memory_truth",
            sourceEntity: "customer",
            sourceField: "customer_id",
            sourceIdField: "id",
            linkName: "Customer-MemoryTruth",
        })
        results.details["customer_memory_truth"] = { scanned, cleaned }
        results.totalScanned += scanned
        results.totalCleaned += cleaned
    } catch (e: any) {
        // Bu link tablosu yoksa sessizce atla
        logger.debug(`[OrphanCleanup] Customer-MemoryTruth taraması atlandı: ${e.message}`)
    }

    // ─── Sonuç raporu ───
    logger.info(
        `[OrphanCleanup] Tamamlandı. ` +
        `Taranan: ${results.totalScanned}, ` +
        `Temizlenen: ${results.totalCleaned}, ` +
        `Hatalar: ${results.errors.length}`
    )

    if (results.totalCleaned > 0) {
        logger.warn(
            `[OrphanCleanup] ${results.totalCleaned} yetim kayıt temizlendi. ` +
            `Detaylar: ${JSON.stringify(results.details)}`
        )
    }
}

export const config = {
    name: "orphan-data-cleanup",
    // Her gün 03:00 UTC'de çalışır
    schedule: "0 3 * * *",
}

// ═══════════════════════════════════════════════════════════════
// Yardımcı Fonksiyon
// ═══════════════════════════════════════════════════════════════

interface CleanOrphanOptions {
    remoteQuery: any
    remoteLink: any
    logger: any
    linkEntity: string
    sourceEntity: string
    sourceField: string
    sourceIdField: string
    linkName: string
}

async function cleanOrphanLinks(opts: CleanOrphanOptions): Promise<{ scanned: number; cleaned: number }> {
    const { remoteQuery, remoteLink, logger, linkEntity, sourceEntity, sourceField, sourceIdField, linkName } = opts

    // 1. Link tablosundaki tüm kayıtları al
    let links: any[] = []
    try {
        const result = await remoteQuery.graph({
            entity: linkEntity,
            fields: ["id", sourceField],
            pagination: { take: 1000 },
        })
        links = result.data || []
    } catch {
        // Link tablosu henüz oluşturulmamış olabilir (migration çalışmamış)
        return { scanned: 0, cleaned: 0 }
    }

    if (links.length === 0) return { scanned: 0, cleaned: 0 }

    // 2. Kaynak entity ID'lerini topla
    const sourceIds = [...new Set(links.map((l: any) => l[sourceField]).filter(Boolean))]

    if (sourceIds.length === 0) return { scanned: links.length, cleaned: 0 }

    // 3. Kaynak entity'lerin hangilerinin hâlâ var olduğunu kontrol et
    let existingIds: Set<string>
    try {
        const result = await remoteQuery.graph({
            entity: sourceEntity,
            fields: [sourceIdField],
            filters: { [sourceIdField]: sourceIds },
            pagination: { take: sourceIds.length },
        })
        existingIds = new Set((result.data || []).map((e: any) => e[sourceIdField]))
    } catch {
        // Kaynak entity sorgulanamadıysa temizleme yapma
        logger.warn(`[OrphanCleanup] ${linkName}: Kaynak entity sorgulanamadı, atlanıyor.`)
        return { scanned: links.length, cleaned: 0 }
    }

    // 4. Yetim kayıtları tespit et
    const orphanLinks = links.filter((l: any) => l[sourceField] && !existingIds.has(l[sourceField]))

    if (orphanLinks.length === 0) {
        logger.debug(`[OrphanCleanup] ${linkName}: Yetim kayıt bulunamadı (${links.length} tarandı)`)
        return { scanned: links.length, cleaned: 0 }
    }

    // 5. Yetim kayıtları sil (batch, max 50 adet)
    let cleaned = 0
    const batchSize = 50

    for (let i = 0; i < orphanLinks.length; i += batchSize) {
        const batch = orphanLinks.slice(i, i + batchSize)
        try {
            for (const orphan of batch) {
                await remoteLink.dismiss({
                    [linkEntity.split("_")[0]]: { [`${linkEntity.split("_")[0]}_id`]: orphan[`${linkEntity.split("_")[0]}_id`] || orphan.id },
                    [sourceEntity]: { [sourceField]: orphan[sourceField] },
                })
                cleaned++
            }
        } catch (e: any) {
            logger.warn(`[OrphanCleanup] ${linkName}: Batch silme hatası: ${e.message}`)
        }
    }

    logger.info(`[OrphanCleanup] ${linkName}: ${cleaned}/${orphanLinks.length} yetim kayıt temizlendi.`)
    return { scanned: links.length, cleaned }
}
