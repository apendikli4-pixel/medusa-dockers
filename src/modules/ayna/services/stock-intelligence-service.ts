import { Logger, RemoteQueryFunction, Context } from "@medusajs/framework/types"

type InjectedDependencies = {
    logger: Logger
}

/**
 * AynaStockIntelligenceService
 * Geçmiş sipariş verilerini analiz ederek otonom stok tahmini yapar.
 */
export default class AynaStockIntelligenceService {
    protected logger_: Logger

    constructor({ logger }: InjectedDependencies) {
        this.logger_ = logger
    }

    /**
     * Tüm ürünler için stok tükenme tahmini yapar
     */
    async predictStockShortages(query: RemoteQueryFunction, daysThreshold: number = 7, sharedContext?: Context) {
        this.logger_.info(`[StockIntelligence] Starting stock shortage prediction (Threshold: ${daysThreshold} days)`)
        
        // 1. Son 30 günlük sipariş kalemlerini çek
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        try {
            const { data: lineItems } = await query.graph({
                entity: "line_item",
                fields: ["variant_id", "quantity", "created_at"],
                filters: {
                    created_at: { $gt: thirtyDaysAgo.toISOString() }
                }
            })

            // 2. Satış hızını hesapla (Variant bazlı)
            const salesVelocity: Record<string, number> = {}
            lineItems.forEach((item: any) => {
                salesVelocity[item.variant_id] = (salesVelocity[item.variant_id] || 0) + item.quantity
            })

            // 3. Mevcut stok seviyelerini çek
            const { data: inventoryItems } = await query.graph({
                entity: "inventory_item",
                fields: ["id", "sku", "stocked_quantity"]
            })

            const shortages = []

            for (const item of inventoryItems) {
                // Not: inventory_item ile variant_id eşleşmesi Medusa v2 Link'leri üzerinden yapılmalıdır.
                // Şimdilik basitleştirilmiş mantık: SKU veya doğrudan eşleşme varsayımı.
                const totalSales = salesVelocity[item.id] || 0
                const dailyRate = totalSales / 30 // Günlük ortalama satış

                if (dailyRate > 0) {
                    const daysRemaining = item.stocked_quantity / dailyRate
                    
                    if (daysRemaining <= daysThreshold) {
                        shortages.push({
                            sku: item.sku,
                            current_stock: item.stocked_quantity,
                            daily_sales: dailyRate.toFixed(2),
                            estimated_days_left: Math.floor(daysRemaining),
                            priority: daysRemaining < 3 ? "CRITICAL" : "HIGH"
                        })
                    }
                }
            }

            return shortages

        } catch (e: any) {
            this.logger_.error(`[StockIntelligence] Prediction error: ${e.message}`)
            return { error: e.message }
        }
    }

    /**
     * Belirli bir ürün için detaylı analiz yapar
     */
    async analyzeProductVelocity(sku: string, sharedContext?: Context) {
        // Tek bir ürün için derinlemesine trend analizi (Artış/Azalış eğilimi)
        return { message: `${sku} için trend analizi hazır (Mock Data).` }
    }
}
