/**
 * VAPE (Elektronik Sigara) Sektörü — Vozol mağazası bu profille çalışır.
 *
 * Karakteristik:
 *   - YAŞ DOĞRULAMA ZORUNLU (18+) — yasal gereklilik, tenant override edemez
 *   - Ürün sayfalarında sağlık uyarısı bandı zorunlu
 *   - Fiziksel stok zorunlu (dürüstlük: olmayan ürün satılmaz)
 *   - Sadakat programı YOK (düzenlemeye tabi üründe teşvik programı riskli)
 *   - MOQ yok; B2B-only ürünler gizli
 */

import { SectorRegistry } from "../registry"
import type { SectorConfig } from "../types"

const vapeConfig: SectorConfig = {
    code: "vape",
    displayName: "Elektronik Sigara",
    description: "18+ yaş doğrulamalı, düzenlemeye tabi elektronik sigara mağazası",

    // loyalty bilinçli olarak YOK: düzenlemeye tabi üründe puan/teşvik
    // programı reklam kısıtlamalarıyla çelişebilir.
    defaultFeatures: ["wishlist"],

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
        requiresAgeVerification: true,
        minimumAge: 18,
        healthWarningRequired: true,
    },

    ai: {
        tone: "yetişkin müşteriye saygılı, ölçülü ve abartısız",
        expertise: ["puff sayısı", "nikotin oranı", "cihaz uyumluluğu", "aroma çeşitleri"],
        contentStyle: "yasal uyarılara duyarlı, sağlık iddiası içermeyen, dürüst",
    },
}

SectorRegistry.register(vapeConfig)
export { vapeConfig }
