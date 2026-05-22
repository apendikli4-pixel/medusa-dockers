/**
 * B2B (İşletmeler Arası Toptan Satış) Sektörü
 *
 * Tipik kullanım: toptan tedarikçi, bayilik sistemi, kurumsal satış.
 *
 * Karakteristik:
 *   - MOQ (Minimum Order Quantity) aktif — her ürünün altında satılamayacağı
 *     bir asgari miktar vardır
 *   - B2B-only ürünler tam görünür
 *   - Bulk pricing zorunlu (volume discount baremleri)
 *   - Fiziksel stok zorunlu (tedarik planlama için kritik)
 *   - Sadakat yerine corporate-account / fatura yönetimi
 *
 * MOQ önceliği (yüksekten düşüğe):
 *   1. product.metadata.moq    (ürün bazlı override)
 *   2. tenant.settings.default_moq  (mağaza geneli override)
 *   3. rules.defaultMoq        (sektör varsayılanı, aşağıda 10)
 */

import { SectorRegistry } from "../registry"
import type { SectorConfig } from "../types"

const b2bConfig: SectorConfig = {
    code: "b2b",
    displayName: "B2B Toptan",
    description: "İşletmeler arası (B2B) toptan satış ve bayi yönetimi",

    defaultFeatures: ["b2b_pricing", "subscriptions"],

    defaultSettings: {
        currency: "TRY",
        locale: "tr-TR",
        taxRate: 20,
    },

    rules: {
        requiresDeliveryDate: false,
        moqEnabled: true,
        defaultMoq: 10,
        showB2BOnlyProducts: true,
        enforcePhysicalStock: true,
        requiresSizeChart: false,
        bulkPricingEnabled: true,
    },

    ai: {
        tone: "resmi ve güven veren",
        expertise: [
            "toptan fiyatlama",
            "minimum sipariş",
            "lojistik planlama",
            "fatura yönetimi",
            "bayi hesabı yönetimi",
        ],
        contentStyle: "kurumsal, veri odaklı",
    },
}

SectorRegistry.register(b2bConfig)
export { b2bConfig }
