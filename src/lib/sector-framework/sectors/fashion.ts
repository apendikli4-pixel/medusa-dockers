/**
 * FASHION (Moda / Tekstil / Giyim) Sektörü
 *
 * Tipik kullanım: hazır giyim, ayakkabı, aksesuar, moda butikleri.
 *
 * Karakteristik:
 *   - Beden tablosu zorunlu (müşterinin yanlış beden almasını önlemek
 *     dürüstlük ilkemiz gereği önemli)
 *   - Fiziksel stok zorunlu (mevsimlik koleksiyon)
 *   - Sadakat ve istek listesi varsayılan aktif
 *   - Bulk pricing yok (tek-tek satış mantığı)
 *   - KDV genelde indirimli oran (tekstil ürünleri Türkiye'de %10)
 */

import { SectorRegistry } from "../registry"
import type { SectorConfig } from "../types"

const fashionConfig: SectorConfig = {
    code: "fashion",
    displayName: "Moda / Giyim",
    description: "Hazır giyim, tekstil ve moda aksesuarları satışı",

    defaultFeatures: ["loyalty", "wishlist"],

    defaultSettings: {
        currency: "TRY",
        locale: "tr-TR",
        taxRate: 10,
    },

    rules: {
        requiresDeliveryDate: false,
        moqEnabled: false,
        showB2BOnlyProducts: false,
        enforcePhysicalStock: true,
        requiresSizeChart: true,
        bulkPricingEnabled: false,
    },

    ai: {
        tone: "enerjik ve trend odaklı",
        expertise: [
            "beden rehberi",
            "stil önerileri",
            "kumaş bilgisi",
            "sezon trendleri",
            "kombin önerisi",
        ],
        contentStyle: "görsel ağırlıklı, ilham verici",
    },
}

SectorRegistry.register(fashionConfig)
export { fashionConfig }
