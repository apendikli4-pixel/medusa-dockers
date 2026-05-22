/**
 * Sector Framework — Tip Tanımları
 *
 * Bu dosya, çoklu mağaza (multi-tenant) sisteminde her mağazanın
 * faaliyet sektörüne göre nasıl davranacağını tanımlayan ortak kontratı içerir.
 *
 * Mimari karar:
 *   - Sektör kuralları KOD içinde tanımlıdır (statik, kompile-time bilinir).
 *     Bu sayede tip güvenliği ve test edilebilirlik sağlanır.
 *   - Sektörler tenant'a göre VARSAYILAN değerler sağlar; tenant.settings
 *     bu varsayılanları override edebilir (örn: B2B varsayılan MOQ=10, ama
 *     bu tenant 25 yazdıysa 25 geçerli olur).
 *
 * @see lib/sector-framework/README.md
 *
 * Bağımlılık ilkesi: Bu modül `modules/tenant`'a BAĞIMLI DEĞİLDİR
 * (tenant modülü buna bağımlıdır). Bu sayede circular dependency yok ve
 * sector-framework başka modüllerden de standalone kullanılabilir.
 */

// ─── SEKTÖR KODLARI ────────────────────────────────────────────────

/**
 * Sistemdeki desteklenen sektör kodları.
 * Tenant modülündeki VALID_SECTORS ile eşleşmelidir.
 *
 * NOT: Genişletildiğinde aşağıdaki listeyi ve tenant/service.ts içindeki
 * VALID_SECTORS sabit dizisini ikisini de güncelleyin (kompile zamanı
 * kontrolü için tip ve runtime kontrolü için sabit dizi ayrı yerlerde).
 */
export const SECTOR_CODES = ["retail", "horeca", "b2b", "fashion"] as const
export type SectorCode = typeof SECTOR_CODES[number]

// ─── KURAL TANIMLARI ───────────────────────────────────────────────

/**
 * Sektöre özel iş kuralları.
 *
 * Bu kurallar sepete ekleme, ürün listeleme ve sipariş onayı aşamalarında
 * SectorRulesService tarafından okunur ve uygulanır.
 *
 * Her kural opsiyoneldir — bir sektörün ihtiyaç duymadığı kural undefined
 * bırakılır. Undefined = "bu sektörde bu kural devrede değil" anlamına gelir.
 */
export interface SectorRules {
    /**
     * Sepete ekleme sırasında bir teslimat/rezervasyon tarihi zorunlu mu?
     * HORECA için true (rezervasyon olmadan masa veya ikram sipariş edilemez).
     */
    requiresDeliveryDate?: boolean

    /**
     * Minimum Sipariş Miktarı (Minimum Order Quantity) kuralı aktif mi?
     * B2B için true, retail için false.
     *
     * Aktifse: önce product.metadata.moq, sonra tenant.settings.default_moq,
     * son çare olarak defaults.moq okunur (SectorRules.defaultMoq).
     */
    moqEnabled?: boolean

    /**
     * MOQ aktifken kullanılacak varsayılan minimum miktar.
     * Product veya tenant level override yoksa bu değer geçerli olur.
     */
    defaultMoq?: number

    /**
     * "Sadece B2B" işaretli ürünleri listeleme akışında göster.
     * Retail mağazasında false → bu ürünler katalogda görünmez.
     * B2B mağazasında true → ürünler görünür ve MOQ kuralları uygulanır.
     */
    showB2BOnlyProducts?: boolean

    /**
     * Fiziksel stok zorunluluğu.
     * true ise: stok 0 olan üründen sipariş alınmaz, dürüstlük politikası
     * gereği "raftaki sayı kadar satıyoruz" mesajı verilir.
     * false ise: backorder/ön sipariş mümkündür (örn: HORECA mutfak siparişi).
     */
    enforcePhysicalStock?: boolean

    /**
     * Beden tablosu görüntüleme zorunluluğu (FASHION).
     * UI tarafında ürün detayında beden seçici öncesi tablonun gösterilmesi
     * gerekir; backend bu bilgiyi UI'ya iletir.
     */
    requiresSizeChart?: boolean

    /**
     * Toplu fiyatlama (volume discount) aktif mi?
     * B2B ve HORECA için tipik olarak true.
     */
    bulkPricingEnabled?: boolean
}

// ─── AI DAVRANIŞ TANIMLARI ─────────────────────────────────────────

/**
 * AI ajanların sektöre göre nasıl davranacağını belirleyen yapılandırma.
 *
 * TenantService.getSectorConfig() ile geriye uyumlu — bu alanlar mevcut
 * `SectorConfig` (tenant/service.ts) içindekiyle aynı isim ve anlamda.
 */
export interface SectorAIBehavior {
    /** AI'ın konuşma tonu — sistem prompt'una eklenir */
    tone: string
    /** Uzmanlık alanı anahtar kelimeleri — AI tool seçiminde kullanılır */
    expertise: string[]
    /** İçerik üretim stili — generate-content workflow tarafından okunur */
    contentStyle: string
}

// ─── ANA KONFİGÜRASYON ─────────────────────────────────────────────

/**
 * Bir sektörün tam yapılandırması.
 *
 * Sektör dosyaları (sectors/retail.ts, sectors/horeca.ts vs.) bu yapıyı
 * doldurarak SectorRegistry'ye kaydeder.
 */
export interface SectorConfig {
    /** Sektör kodu — Tenant.sector ile eşleşir */
    code: SectorCode

    /** İnsan-okunabilir sektör adı (TR) */
    displayName: string

    /** Kısa açıklama (admin panel ve dokümantasyon için) */
    description: string

    /**
     * Yeni tenant oluşturulurken otomatik aktive edilecek özellikler.
     * createTenantWorkflow tarafından kullanılır.
     *
     * NOT: tenant modülündeki `VALID_FEATURES` ile aynı string'ler olmalı
     * (örn: "loyalty", "reservations", "subscriptions", "wishlist",
     * "b2b_pricing", "pos"). Çapraz tip kontrolü için tenant tarafında
     * `TenantFeature` ile cast edilir.
     */
    defaultFeatures: string[]

    /**
     * Yeni tenant oluşturulurken settings JSON'una eklenecek varsayılanlar.
     * Tenant açıkça farklı değer verdiyse tenant'ın değeri geçerli olur.
     */
    defaultSettings: {
        currency: string
        locale: string
        /** KDV oranı (yüzde, 0-100 arası) */
        taxRate: number
    }

    /** Sektöre özel iş kuralları */
    rules: SectorRules

    /** AI davranış yapılandırması */
    ai: SectorAIBehavior
}

// ─── VALİDATION RESULT ─────────────────────────────────────────────

/**
 * Sektörel kural ihlal tipi — UI ve loglama için.
 */
export type SectorRuleViolation =
    | "MISSING_DELIVERY_DATE"
    | "MOQ_NOT_MET"
    | "PRODUCT_NOT_AVAILABLE_IN_SECTOR"
    | "INSUFFICIENT_PHYSICAL_STOCK"

/**
 * SectorRulesService.validateCartItem sonucu.
 *
 * Dürüstlük ilkesi: Kural ihlali halinde NEDEN ihlal edildiği müşteriye
 * açıkça (ve teknik detay sızdırmadan) anlatılır.
 */
export interface SectorValidationResult {
    /** Doğrulama geçti mi? */
    valid: boolean
    /** Geçmediyse: ihlal kodu (loglama ve i18n için makine-okunabilir) */
    violation?: SectorRuleViolation
    /** Geçmediyse: müşteriye gösterilecek dürüst hata mesajı (TR) */
    message?: string
    /** Geçmediyse: dürüstlük açıklama notu */
    honestyNote?: string
}
