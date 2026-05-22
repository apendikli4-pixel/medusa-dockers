/**
 * RETAIL (Perakende) Sektörü
 *
 * Tipik kullanım: standart e-ticaret, B2C mağazaları, online satış.
 *
 * Karakteristik:
 *   - Fiziksel stok zorunlu (dürüstlük: olmayan ürün satılmaz)
 *   - MOQ yok, müşteri 1 adet de alabilir
 *   - B2B-only ürünler katalogdan gizli
 *   - Sadakat programı varsayılan aktif
 */

import { SectorRegistry } from "../registry"
import type { SectorConfig } from "../types"

const retailConfig: SectorConfig = {
    code: "retail",
    displayName: "Perakende",
    description: "Standart son-tüketici (B2C) e-ticaret mağazası",

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
    },

    ai: {
        tone: "samimi ve bilgilendirici",
        expertise: ["ürün özellikleri", "stok durumu", "fiyat karşılaştırma"],
        contentStyle: "kısa, net, müşteri odaklı",
    },
}

SectorRegistry.register(retailConfig)
export { retailConfig }
