/**
 * HORECA (Otel, Restoran, Kafe) Sektörü
 *
 * Tipik kullanım: restoran rezervasyon ve sipariş, kafe menü sistemi,
 * otel oda servisi, catering şirketleri.
 *
 * Karakteristik:
 *   - Teslimat/rezervasyon tarihi zorunlu (operasyonel zorunluluk)
 *   - Mutfak hazırlık süresi nedeniyle backorder mümkün (stok zorunlu değil)
 *   - Bulk pricing aktif (toplu sipariş indirimleri)
 *   - Rezervasyon ve mutfak modülleri varsayılan aktif
 */

import { SectorRegistry } from "../registry"
import type { SectorConfig } from "../types"

const horecaConfig: SectorConfig = {
    code: "horeca",
    displayName: "Otel / Restoran / Kafe",
    description: "Yiyecek-içecek ve konaklama sektörü için rezervasyon ve sipariş sistemi",

    defaultFeatures: ["reservations", "subscriptions"],

    defaultSettings: {
        currency: "TRY",
        locale: "tr-TR",
        taxRate: 10, // Gıda hizmeti KDV'si genelde düşürülmüş orandır
    },

    rules: {
        requiresDeliveryDate: true,
        moqEnabled: false,
        showB2BOnlyProducts: false,
        enforcePhysicalStock: false, // mutfak gerçek zamanlı hazırlar
        requiresSizeChart: false,
        bulkPricingEnabled: true,
    },

    ai: {
        tone: "profesyonel ve çözüm odaklı",
        expertise: [
            "rezervasyon yönetimi",
            "menü önerisi",
            "toplu sipariş",
            "kurulum hizmeti",
            "teknik destek",
        ],
        contentStyle: "teknik detaylı, proje odaklı",
    },
}

SectorRegistry.register(horecaConfig)
export { horecaConfig }
