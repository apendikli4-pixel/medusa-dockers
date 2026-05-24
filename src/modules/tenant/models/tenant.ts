/**
 * Tenant (Mağaza) Modeli — Çoklu Mağaza Sistemi
 *
 * Bu model, platformdaki her bağımsız mağazayı (tenant) temsil eder.
 * Her tenant kendi ürünlerine, ayarlarına ve özelliklerine sahiptir.
 *
 * Medusa v2 DML kullanır (model.define).
 * TypeORM @Entity KULLANILMAZ — Medusa v2 ile uyumsuz olduğundan runtime hatası verir.
 *
 * @see GENESIS_PROTOCOL kuralı: "Only Medusa v2 patterns — never use TypeORM @Entity"
 * @see GENESIS_PROTOCOL kuralı: "model.number() kullan, model.bigint()/model.double() YASAK"
 */
import { model } from "@medusajs/framework/utils"

export const Tenant = model.define("tenant", {
    /**
     * Benzersiz tanımlayıcı (UUID).
     * Medusa tarafından otomatik oluşturulur.
     */
    id: model.id().primaryKey(),

    /**
     * Mağaza adı.
     * Kullanıcıya gösterilecek resmi isim, örn: "Aqua Havuz Antalya".
     */
    name: model.text(),

    /**
     * Benzersiz URL slug'ı — subdomain ve route ayrıştırma için kullanılır.
     * Örnek: "aqua-antalya" → antalya.aquahavuz.com veya aquahavuz.com/store/aqua-antalya
     * Aynı slug'dan iki tenant olamaz.
     */
    slug: model.text().unique(),

    /**
     * Mağazanın faaliyet gösterdiği sektör.
     * Geçerli değerler: 'retail' (perakende), 'horeca' (otel/restoran/cafe),
     * 'b2b' (toptan satış), 'fashion' (moda/giyim).
     * Sektöre göre farklı iş kuralları ve fiyatlama uygulanabilir.
     *
     * NOT: Medusa v2 DML'de enum tipi yoktur.
     * Değer doğrulaması servis katmanında Zod ile yapılır.
     */
    sector: model.text().default("retail"),

    /**
     * Mağazaya özel JSON ayarları.
     * İçerebilecek örnek alanlar:
     * - theme: { primaryColor: "#0066FF", logo: "url..." }
     * - locale: "tr-TR"
     * - currency: "TRY"
     * - tax_rate: 20
     * - contact: { phone: "...", email: "...", address: "..." }
     *
     * JSONB olarak saklanır, esnek yapı sağlar.
     */
    settings: model.json().nullable(),

    /**
     * Bu mağazada aktif olan özellik listesi.
     * JSON array olarak saklanır, örn: ["loyalty", "reservations", "subscriptions"]
     *
     * Desteklenen özellikler:
     * - "loyalty"       → Sadakat puanı sistemi
     * - "reservations"  → Ürün rezervasyon sistemi
     * - "subscriptions" → Abonelik sistemi
     * - "wishlist"      → İstek listesi
     * - "b2b_pricing"   → Toptan fiyatlama
     * - "pos"           → Fiziksel POS satış
     *
     * NOT: Medusa v2 DML'de native string array yoktur.
     * JSON olarak saklanıp, servis katmanında string[] olarak okunur.
     */
    // V2.15: model.json() default'u Record<string, unknown> bekler; array değer
    // için varsayılan vermek yerine null bırakıyoruz, servis katmanı [] olarak yorumlar.
    features: model.json().nullable(),

    /**
     * Mağaza aktif mi?
     * false ise mağaza askıya alınmış demektir — hiçbir endpoint veri döndürmez.
     * Ödeme gecikmeleri veya kural ihlallerinde admin tarafından devre dışı bırakılabilir.
     */
    is_active: model.boolean().default(true),

    /**
     * Mağaza sahibinin (admin kullanıcısının) ID'si.
     * Medusa'nın kendi auth_user tablosundaki ID ile eşleşir.
     * Bu alan üzerinden "bu tenant kime ait?" sorusuna cevap verilir.
     */
    owner_id: model.text().nullable(), // index Migration20260513120000.ts içinde ayrıca tanımlı

    /**
     * Opsiyonel özel alan adı.
     * Örn: "www.antalya-havuz.com" → bu domain'e gelen istekler bu tenant'a yönlendirilir.
     * null ise sadece slug tabanlı erişim kullanılır.
     */
    domain: model.text().nullable(),

    /**
     * Serbest formatta ek veriler.
     * Entegrasyonlara özel bilgiler, notlar vb. buraya konulabilir.
     */
    metadata: model.json().nullable(),
})
