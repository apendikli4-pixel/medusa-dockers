import { MedusaContainer } from "@medusajs/framework/types"

/**
 * DailyStockAuditJob
 * Her sabah stok seviyelerini analiz eder ve kritik ürünler için 'Mission' oluşturur.
 * Otonom depo yöneticisi görevini üstlenir.
 */
export default async function dailyStockAuditJob(container: MedusaContainer) {
    const logger = container.resolve("logger") as any
    const aynaService = container.resolve("ayna") as any
    const stockIntelligence = container.resolve("aynaStockIntelligenceService") as any

    logger.info("[Ayna] Daily stock audit started.")

    try {
        // 1. 7 günlük eşik ile stok tahminlerini çek
        const shortages = await stockIntelligence.predictStockShortages(7)

        if (!shortages || shortages.length === 0) {
            logger.info("[Ayna] No stock shortages predicted. System healthy.")
            return
        }

        // 2. Her kritik ürün için bir Mission (Görev) oluştur
        for (const item of shortages) {
            const title = `[STOK KRİTİK] ${item.sku} - ${item.estimated_days_left} Gün Kaldı`
            const description = `Mevcut Stok: ${item.current_stock}. Günlük ortalama satış hızı: ${item.daily_sales}. Tahmini tükenme süresi: ${item.estimated_days_left} gün. Lütfen tedarik planlayın.`

            // Mevcut görevleri kontrol et (Aynı ürün için mükerrer görev açmamak için)
            const [existingMissions] = await aynaService.listAndCountMissions({
                title,
                status: "pending"
            })

            if (existingMissions.length === 0) {
                await aynaService.createMissions({
                    title,
                    description,
                    priority: item.priority === "CRITICAL" ? "high" : "medium",
                    status: "pending",
                    metadata: {
                        type: "stock_alert",
                        sku: item.sku,
                        prediction: item
                    }
                })
                logger.info(`[Ayna] Stock mission created for SKU: ${item.sku}`)
            }
        }

        logger.info(`[Ayna] Stock audit completed. ${shortages.length} shortage(s) handled.`)

    } catch (err: any) {
        logger.error(`[Ayna] Stock audit job failure: ${err.message}`)
    }
}

export const config = {
    name: "daily-stock-audit-job",
    schedule: "0 9 * * *", // Her gün sabah saat 09:00'da
}
