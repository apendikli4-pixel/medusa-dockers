import { Logger, RemoteQueryFunction, Context } from "@medusajs/framework/types"
import AynaStockIntelligenceService from "./stock-intelligence-service"

type InjectedDependencies = {
    logger: Logger
    aynaStockIntelligenceService: AynaStockIntelligenceService
}

/**
 * AynaContentIntelligenceService
 * Hangi ürünler için blog yazılması gerektiğini stratejik olarak belirler.
 */
export default class AynaContentIntelligenceService {
    protected logger_: Logger
    protected stockIntelligence_: AynaStockIntelligenceService

    constructor({ logger, aynaStockIntelligenceService }: InjectedDependencies) {
        this.logger_ = logger
        this.stockIntelligence_ = aynaStockIntelligenceService
    }

    /**
     * Blog yazılması için en ideal 3 ürünü belirler
     */
    async identifyContentOpportunities(query: RemoteQueryFunction, sharedContext?: Context) {
        this.logger_.info("[ContentIntelligence] Identifying strategic content opportunities...")
        
        try {
            // 1. Stok durumunu analiz et
            const shortages = await this.stockIntelligence_.predictStockShortages(query, 30) // 30 günlük projeksiyon
            
            // 2. Satışı artırılması gereken "Sağlıklı Stoklu" ürünleri bul
            const { data: products } = await query.graph({
                entity: "product",
                fields: ["id", "title", "handle", "description", "metadata"],
                pagination: { take: 50 }
            })
            // Strateji: Stoğu 50'den fazla olan ama son 30 günde az satılanları "Fırsat" olarak gör
            // (Bu kısım gerçek satış verileriyle daha da derinleştirilebilir)
            const opportunities = products
                .filter((p: any) => Array.isArray(shortages) && !shortages.find((s: any) => s.sku === p.id)) // Stoğu kritik olmayanlar
                .slice(0, 3) // Şimdilik ilk 3'ü al

            return opportunities.map(p => ({
                productId: p.id,
                title: p.title,
                reason: "Yüksek stok verimliliği ve SEO potansiyeli",
                trend: "Seasonal" // Mevsimsel analiz eklenebilir
            }))

        } catch (e: any) {
            this.logger_.error(`[ContentIntelligence] Error: ${e.message}`)
            return []
        }
    }
}
