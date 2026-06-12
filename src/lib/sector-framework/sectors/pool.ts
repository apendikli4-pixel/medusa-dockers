/**
 * POOL (Havuz & Bahçe) Sektörü — Aqua Havuz mağazası bu profille çalışır.
 *
 * Karakteristik:
 *   - Teknik özellik alanları (debi, güç, hacim) içerikte beklenir;
 *     AI içerik üretimi ve ürün detay UI'ı bu bayrağı okur
 *   - Fiziksel stok zorunlu (dürüstlük: olmayan ürün satılmaz)
 *   - Sadakat + istek listesi varsayılan aktif
 *   - MOQ yok; B2B-only ürünler gizli
 */

import { SectorRegistry } from "../registry"
import type { SectorConfig } from "../types"

const poolConfig: SectorConfig = {
    code: "pool",
    displayName: "Havuz & Bahçe",
    description: "Havuz kimyasalları, ekipman ve bahçe ürünleri mağazası",

    defaultFeatures: ["loyalty", "wishlist"],

    defaultSettings: {
        currency: "TRY",
        locale: "tr-TR",
        taxRate: 20,
    },

    rules: {
        requiresDeliveryDate: false,
        moqEnabled: false,
        showB2BOnlyProducts: false,
        enforcePhysicalStock: true,
        requiresSizeChart: false,
        bulkPricingEnabled: false,
        technicalSpecsRequired: true,
    },

    ai: {
        tone: "teknik konularda güven veren, sabırlı uzman",
        expertise: ["havuz kimyasalları", "pompa ve filtre seçimi", "hacim hesaplama", "su bakımı"],
        contentStyle: "teknik ama anlaşılır; ölçü/değer odaklı, mevsimsel bağlama duyarlı",
    },
}

SectorRegistry.register(poolConfig)
export { poolConfig }
