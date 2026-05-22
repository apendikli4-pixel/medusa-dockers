/**
 * TenantBusinessService — Tenant İş Mantığı Servisi
 *
 * Bu sınıf, tenant (mağaza) ile ilgili tüm iş kurallarını yönetir.
 * MedusaService'den extend ETMEZ — ana service.ts'in alt servisidir.
 *
 * Mimari pattern: Ayna modülündeki memory-service.ts, chat-service.ts gibi
 * bu da bir "sub-service"dir. Ana TenantService (service.ts) bu sınıfa delege eder.
 *
 * Dürüstlük ilkesi:
 * - Her işlem loglanır (logger ile)
 * - Her hata açıklayıcı mesaj ve sebep içerir
 * - Her işlem sonucu TenantOperationResult ile döner
 */
import { Logger } from "@medusajs/framework/types"
import {
    CreateTenantDTO,
    UpdateTenantDTO,
    TenantListFilters,
    TenantOperationResult,
    TenantFeature,
} from "../types"
import { VALID_SECTORS, VALID_FEATURES } from "../service"

/**
 * Slug formatı validasyonu için regex.
 * Sadece küçük harf, rakam ve tire (-) içerebilir.
 * Örnekler: "aqua-antalya", "store1", "b2b-wholesale"
 */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * İşlem sonucu oluşturmak için yardımcı fonksiyon.
 * Tüm metodlar bu fonksiyonu kullanarak tutarlı sonuç formatı döndürür.
 */
function createResult<T>(
    success: boolean,
    data: T | null,
    message: string
): TenantOperationResult<T> {
    return { success, data, message, timestamp: new Date() }
}

export default class TenantBusinessService {
    /**
     * Logger referansı — her işlem loglanır.
     * Winston logger kullanır (projenin src/lib/logger.ts ile uyumlu).
     */
    protected logger_: Logger

    /**
     * Ana MedusaService referansı — DB işlemleri için kullanılır.
     * MedusaService'in otomatik CRUD metodlarına (listTenants, createTenants vb.)
     * bu referans üzerinden erişilir.
     */
    protected tenantService_: any

    constructor(logger: Logger, tenantService: any) {
        this.logger_ = logger
        this.tenantService_ = tenantService
    }

    // ────────────────────────────────────────────────
    // 1. CREATE — Yeni Mağaza Oluştur
    // ────────────────────────────────────────────────

    /**
     * Yeni bir mağaza (tenant) oluşturur.
     *
     * İş kuralları:
     * - Slug benzersiz olmalı (aynı slug'dan iki mağaza olamaz)
     * - Slug formatı: sadece küçük harf, rakam ve tire
     * - Sektör geçerli bir değer olmalı (retail, horeca, b2b, fashion)
     * - Features dizisi yalnızca geçerli değerler içermeli
     *
     * @param data - CreateTenantDTO — zorunlu: name, slug, sector
     * @returns TenantOperationResult — başarı/başarısızlık durumu ve tenant verisi
     */
    async create(data: CreateTenantDTO): Promise<TenantOperationResult> {
        this.logger_.info(`[Tenant] Yeni mağaza oluşturuluyor: "${data.name}" (slug: ${data.slug})`)

        // ─── Slug format kontrolü ───
        if (!SLUG_REGEX.test(data.slug)) {
            const reason = `Geçersiz slug formatı: "${data.slug}". Slug sadece küçük harf, rakam ve tire (-) içerebilir.`
            this.logger_.warn(`[Tenant] Oluşturma reddedildi — ${reason}`)
            return createResult(false, null, reason)
        }

        // ─── Slug benzersizlik kontrolü ───
        const existingBySlug = await this.tenantService_.listTenants(
            { slug: data.slug },
            { take: 1 }
        )
        if (existingBySlug.length > 0) {
            const reason = `Bu slug zaten kullanımda: "${data.slug}". Her mağazanın benzersiz bir slug'ı olmalı.`
            this.logger_.warn(`[Tenant] Oluşturma reddedildi — ${reason}`)
            return createResult(false, null, reason)
        }

        // ─── Sektör validasyonu ───
        if (!VALID_SECTORS.includes(data.sector as any)) {
            const reason = `Geçersiz sektör: "${data.sector}". Geçerli değerler: ${VALID_SECTORS.join(", ")}`
            this.logger_.warn(`[Tenant] Oluşturma reddedildi — ${reason}`)
            return createResult(false, null, reason)
        }

        // ─── Features validasyonu ───
        if (data.features && data.features.length > 0) {
            const invalidFeatures = data.features.filter(
                (f) => !VALID_FEATURES.includes(f as any)
            )
            if (invalidFeatures.length > 0) {
                const reason = `Geçersiz özellikler: ${invalidFeatures.join(", ")}. Geçerli değerler: ${VALID_FEATURES.join(", ")}`
                this.logger_.warn(`[Tenant] Oluşturma reddedildi — ${reason}`)
                return createResult(false, null, reason)
            }
        }

        // ─── Domain benzersizlik kontrolü (opsiyonel alan) ───
        if (data.domain) {
            const existingByDomain = await this.tenantService_.listTenants(
                { domain: data.domain },
                { take: 1 }
            )
            if (existingByDomain.length > 0) {
                const reason = `Bu domain zaten kullanımda: "${data.domain}".`
                this.logger_.warn(`[Tenant] Oluşturma reddedildi — ${reason}`)
                return createResult(false, null, reason)
            }
        }

        // ─── Mağazayı oluştur ───
        const tenant = await this.tenantService_.createTenants({
            name: data.name,
            slug: data.slug,
            sector: data.sector,
            settings: data.settings || null,
            features: data.features || [],
            is_active: true,
            owner_id: data.owner_id || null,
            domain: data.domain || null,
            metadata: data.metadata || null,
        })

        this.logger_.info(
            `[Tenant] Mağaza başarıyla oluşturuldu: "${data.name}" (id: ${tenant.id}, slug: ${data.slug})`
        )

        return createResult(true, tenant, `Mağaza "${data.name}" başarıyla oluşturuldu.`)
    }

    // ────────────────────────────────────────────────
    // 2. UPDATE — Mağaza Güncelle
    // ────────────────────────────────────────────────

    /**
     * Mevcut bir mağazanın bilgilerini günceller.
     *
     * İş kuralları:
     * - Mağaza mevcut olmalı
     * - Slug değiştiriliyorsa benzersizlik kontrol edilir
     * - Domain değiştiriliyorsa benzersizlik kontrol edilir
     * - Settings alanı mevcut ayarlarla birleştirilir (merge)
     *
     * @param id - Güncellenecek mağazanın ID'si
     * @param data - UpdateTenantDTO — sadece gönderilen alanlar güncellenir
     */
    async update(id: string, data: UpdateTenantDTO): Promise<TenantOperationResult> {
        this.logger_.info(`[Tenant] Mağaza güncelleniyor: ${id}`)

        // ─── Mağaza var mı kontrolü ───
        let existing: any
        try {
            existing = await this.tenantService_.retrieveTenant(id)
        } catch {
            const reason = `Mağaza bulunamadı: ${id}`
            this.logger_.warn(`[Tenant] Güncelleme reddedildi — ${reason}`)
            return createResult(false, null, reason)
        }

        // ─── Slug değişiyorsa benzersizlik kontrolü ───
        if (data.slug && data.slug !== existing.slug) {
            if (!SLUG_REGEX.test(data.slug)) {
                const reason = `Geçersiz slug formatı: "${data.slug}".`
                this.logger_.warn(`[Tenant] Güncelleme reddedildi — ${reason}`)
                return createResult(false, null, reason)
            }

            const conflicting = await this.tenantService_.listTenants(
                { slug: data.slug },
                { take: 1 }
            )
            if (conflicting.length > 0) {
                const reason = `Bu slug zaten başka bir mağaza tarafından kullanılıyor: "${data.slug}".`
                this.logger_.warn(`[Tenant] Güncelleme reddedildi — ${reason}`)
                return createResult(false, null, reason)
            }
        }

        // ─── Sektör validasyonu ───
        if (data.sector && !VALID_SECTORS.includes(data.sector as any)) {
            const reason = `Geçersiz sektör: "${data.sector}". Geçerli değerler: ${VALID_SECTORS.join(", ")}`
            return createResult(false, null, reason)
        }

        // ─── Features validasyonu ───
        if (data.features) {
            const invalidFeatures = data.features.filter(
                (f) => !VALID_FEATURES.includes(f as any)
            )
            if (invalidFeatures.length > 0) {
                const reason = `Geçersiz özellikler: ${invalidFeatures.join(", ")}.`
                return createResult(false, null, reason)
            }
        }

        // ─── Domain benzersizlik kontrolü ───
        if (data.domain && data.domain !== existing.domain) {
            const conflicting = await this.tenantService_.listTenants(
                { domain: data.domain },
                { take: 1 }
            )
            if (conflicting.length > 0) {
                const reason = `Bu domain zaten kullanımda: "${data.domain}".`
                return createResult(false, null, reason)
            }
        }

        // ─── Settings merge (birleştirme) ───
        // Mevcut ayarları koruyarak sadece gönderilen alanları güncelle
        const mergedSettings = data.settings !== undefined
            ? { ...(existing.settings || {}), ...(data.settings || {}) }
            : undefined

        // ─── Güncelleme verisini hazırla (sadece gönderilen alanlar) ───
        const updatePayload: Record<string, unknown> = {}
        if (data.name !== undefined) updatePayload.name = data.name
        if (data.slug !== undefined) updatePayload.slug = data.slug
        if (data.sector !== undefined) updatePayload.sector = data.sector
        if (mergedSettings !== undefined) updatePayload.settings = mergedSettings
        if (data.features !== undefined) updatePayload.features = data.features
        if (data.is_active !== undefined) updatePayload.is_active = data.is_active
        if (data.owner_id !== undefined) updatePayload.owner_id = data.owner_id
        if (data.domain !== undefined) updatePayload.domain = data.domain
        if (data.metadata !== undefined) updatePayload.metadata = data.metadata

        const updated = await this.tenantService_.updateTenants({
            selector: { id },
            data: updatePayload,
        })

        // updateTenants dizi veya tekil obje dönebilir
        const result = Array.isArray(updated) ? updated[0] : updated

        this.logger_.info(
            `[Tenant] Mağaza güncellendi: ${id} — güncellenen alanlar: ${Object.keys(updatePayload).join(", ")}`
        )

        return createResult(true, result, `Mağaza başarıyla güncellendi.`)
    }

    // ────────────────────────────────────────────────
    // 3. GET — Mağaza Bilgilerini Getir
    // ────────────────────────────────────────────────

    /**
     * ID'ye göre tek bir mağazanın detaylarını getirir.
     *
     * @param id - Mağaza ID'si (UUID)
     * @returns Mağaza bilgileri veya bulunamadı hatası
     */
    async get(id: string): Promise<TenantOperationResult> {
        this.logger_.debug(`[Tenant] Mağaza getiriliyor: ${id}`)

        try {
            const tenant = await this.tenantService_.retrieveTenant(id)
            return createResult(true, tenant, "Mağaza bilgileri başarıyla getirildi.")
        } catch {
            const reason = `Mağaza bulunamadı: ${id}`
            this.logger_.warn(`[Tenant] ${reason}`)
            return createResult(false, null, reason)
        }
    }

    // ────────────────────────────────────────────────
    // 4. LIST — Mağazaları Listele
    // ────────────────────────────────────────────────

    /**
     * Filtreleme ile mağazaları listeler.
     *
     * @param filters - Opsiyonel filtreler (sector, is_active, owner_id, name)
     * @param options - Sayfalama: { take, skip }
     * @returns Mağaza listesi ve toplam kayıt sayısı
     */
    async list(
        filters?: TenantListFilters,
        options?: { take?: number; skip?: number }
    ): Promise<TenantOperationResult<{ tenants: any[]; count: number }>> {
        this.logger_.debug(`[Tenant] Mağazalar listeleniyor — filtreler: ${JSON.stringify(filters || {})}`)

        // ─── Filtre objesini oluştur (sadece tanımlı değerleri ekle) ───
        const queryFilters: Record<string, unknown> = {}
        if (filters?.sector) queryFilters.sector = filters.sector
        if (filters?.is_active !== undefined) queryFilters.is_active = filters.is_active
        if (filters?.owner_id) queryFilters.owner_id = filters.owner_id

        const take = options?.take ?? 20
        const skip = options?.skip ?? 0

        const tenants = await this.tenantService_.listTenants(
            queryFilters,
            { take, skip }
        )

        // İsim filtresi — Medusa listTenants contains desteklemediğinden
        // uygulama katmanında filtreliyoruz
        let filtered = tenants
        if (filters?.name) {
            const searchTerm = filters.name.toLowerCase()
            filtered = tenants.filter((t: any) =>
                t.name.toLowerCase().includes(searchTerm)
            )
        }

        return createResult(true, {
            tenants: filtered,
            count: filtered.length,
        }, `${filtered.length} mağaza listelendi.`)
    }

    // ────────────────────────────────────────────────
    // 5. GET BY SLUG — Subdomain'den Mağaza Bul
    // ────────────────────────────────────────────────

    /**
     * Slug'a göre aktif mağazayı bulur.
     * Tenant çözümleme middleware'ı tarafından her istekte çağrılır.
     *
     * @param slug - Mağaza slug'ı (benzersiz URL tanımlayıcı)
     * @returns Aktif mağaza veya bulunamadı hatası
     */
    async getBySlug(slug: string): Promise<TenantOperationResult> {
        this.logger_.debug(`[Tenant] Slug ile aranıyor: "${slug}"`)

        const [tenant] = await this.tenantService_.listTenants(
            { slug },
            { take: 1 }
        )

        if (!tenant) {
            return createResult(false, null, `Slug "${slug}" ile eşleşen mağaza bulunamadı.`)
        }

        if (!(tenant as any).is_active) {
            this.logger_.warn(`[Tenant] Slug "${slug}" ile eşleşen mağaza askıya alınmış.`)
            return createResult(false, null, `Mağaza "${slug}" şu anda aktif değil.`)
        }

        return createResult(true, tenant, "Mağaza bulundu.")
    }

    // ────────────────────────────────────────────────
    // 6. ACTIVATE — Mağazayı Aktif Et
    // ────────────────────────────────────────────────

    /**
     * Askıya alınmış bir mağazayı yeniden aktifleştirir.
     *
     * Loglama: Kim ne zaman aktifleştirdi kaydedilir.
     *
     * @param id - Mağaza ID'si
     * @returns İşlem sonucu
     */
    async activate(id: string): Promise<TenantOperationResult> {
        this.logger_.info(`[Tenant] Mağaza aktifleştiriliyor: ${id}`)

        let existing: any
        try {
            existing = await this.tenantService_.retrieveTenant(id)
        } catch {
            return createResult(false, null, `Mağaza bulunamadı: ${id}`)
        }

        // Zaten aktifse gereksiz güncelleme yapma
        if (existing.is_active) {
            this.logger_.info(`[Tenant] Mağaza zaten aktif: ${id}`)
            return createResult(true, existing, "Mağaza zaten aktif durumda.")
        }

        const updated = await this.tenantService_.updateTenants({
            selector: { id },
            data: { is_active: true },
        })

        const result = Array.isArray(updated) ? updated[0] : updated
        this.logger_.info(`[Tenant] Mağaza aktifleştirildi: ${id} (${existing.name})`)

        return createResult(true, result, `Mağaza "${existing.name}" başarıyla aktifleştirildi.`)
    }

    // ────────────────────────────────────────────────
    // 7. DEACTIVATE — Mağazayı Pasif Et
    // ────────────────────────────────────────────────

    /**
     * Bir mağazayı askıya alır. Askıya alınan mağazanın
     * endpoint'leri veri döndürmez, ürünleri listelenemez.
     *
     * Dürüstlük ilkesi: Mağaza silinmez, soft-deactivate uygulanır.
     * İstendiğinde activate() ile yeniden açılabilir.
     *
     * @param id - Mağaza ID'si
     * @returns İşlem sonucu
     */
    async deactivate(id: string): Promise<TenantOperationResult> {
        this.logger_.info(`[Tenant] Mağaza pasifleştiriliyor: ${id}`)

        let existing: any
        try {
            existing = await this.tenantService_.retrieveTenant(id)
        } catch {
            return createResult(false, null, `Mağaza bulunamadı: ${id}`)
        }

        // Zaten pasifse gereksiz güncelleme yapma
        if (!existing.is_active) {
            this.logger_.info(`[Tenant] Mağaza zaten pasif: ${id}`)
            return createResult(true, existing, "Mağaza zaten pasif durumda.")
        }

        const updated = await this.tenantService_.updateTenants({
            selector: { id },
            data: { is_active: false },
        })

        const result = Array.isArray(updated) ? updated[0] : updated
        this.logger_.info(`[Tenant] Mağaza pasifleştirildi: ${id} (${existing.name})`)

        return createResult(true, result, `Mağaza "${existing.name}" askıya alındı.`)
    }
}
