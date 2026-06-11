/**
 * TenantService — Çoklu Mağaza Ana Servisi (Orchestrator)
 *
 * MedusaService'den extend ederek otomatik CRUD metodları kazanır:
 * - listTenants(), retrieveTenant(), createTenants(), updateTenants(), deleteTenants()
 *
 * İş mantığı TenantBusinessService alt servisine delege edilir.
 * Bu dosya Ayna modülündeki service.ts → services/ pattern'ini takip eder.
 *
 * Her metod Türkçe yorum ile belgelenmiştir.
 */
import { MedusaService } from "@medusajs/framework/utils"
import { Logger } from "@medusajs/framework/types"
import { Tenant } from "./models/tenant"
import TenantBusinessService from "./services/tenant-business.service"
import { SectorRegistry } from "../../lib/sector-framework"
import type {
    CreateTenantDTO,
    UpdateTenantDTO,
    TenantListFilters,
    TenantOperationResult,
} from "./types"

/**
 * Sektör enum değerleri — Zod validasyonunda da kullanılır (TEK KAYNAK).
 * Medusa DML'de native enum olmadığından, bu sabit dizi ile kontrol sağlanır.
 *
 * Storefront tema sistemi (storefront/src/lib/themes.ts SectorKey) ile senkron
 * tutulur. Yeni sektör eklerken iki yeri birden güncelle:
 *   1) Bu liste (backend validasyonu — admin API bunu kullanır)
 *   2) storefront SECTOR_THEMES (tema + metin preset'i; tanımsızsa universal'a düşer)
 */
export const VALID_SECTORS = [
    "retail", "horeca", "b2b", "fashion",
    "electronics", "vape", "pool", "universal", "villa",
] as const
export type TenantSector = typeof VALID_SECTORS[number]

/**
 * Desteklenen özellik listesi.
 * features JSON alanında sadece bu değerler kabul edilir.
 */
export const VALID_FEATURES = [
    "loyalty",
    "reservations",
    "subscriptions",
    "wishlist",
    "b2b_pricing",
    "pos",
] as const
export type TenantFeature = typeof VALID_FEATURES[number]

type InjectedDependencies = {
    logger: Logger
}

export default class TenantService extends MedusaService({
    Tenant,
}) {
    /** Modül tanımlayıcı — container'dan resolve için */
    static identifier = "tenant"

    protected logger_: Logger
    protected businessService_: TenantBusinessService

    constructor(container: InjectedDependencies) {
        super(container)
        this.logger_ = container.logger
        // Sub-service'e ana servisi (this) ve logger'ı enjekte et
        this.businessService_ = new TenantBusinessService(this.logger_, this)
    }

    // ────────────────────────────────────────────────
    // İş mantığı metodları — TenantBusinessService'e delege
    // ────────────────────────────────────────────────

    /** Yeni mağaza oluştur (validasyon + loglama dahil) */
    async create(data: CreateTenantDTO): Promise<TenantOperationResult> {
        return this.businessService_.create(data)
    }

    /** Mağaza güncelle (validasyon + loglama dahil) */
    async update(id: string, data: UpdateTenantDTO): Promise<TenantOperationResult> {
        return this.businessService_.update(id, data)
    }

    /** ID'ye göre mağaza getir */
    async get(id: string): Promise<TenantOperationResult> {
        return this.businessService_.get(id)
    }

    /** Filtreleme ile mağazaları listele */
    async list(
        filters?: TenantListFilters,
        options?: { take?: number; skip?: number }
    ): Promise<TenantOperationResult<{ tenants: any[]; count: number }>> {
        return this.businessService_.list(filters, options)
    }

    /** Slug'a göre aktif mağazayı bul */
    async getBySlug(slug: string): Promise<TenantOperationResult> {
        return this.businessService_.getBySlug(slug)
    }

    /** Mağazayı aktifleştir */
    async activate(id: string): Promise<TenantOperationResult> {
        return this.businessService_.activate(id)
    }

    /** Mağazayı pasifleştir (askıya al) */
    async deactivate(id: string): Promise<TenantOperationResult> {
        return this.businessService_.deactivate(id)
    }

    // ────────────────────────────────────────────────
    // Hızlı erişim metodları (middleware ve diğer servisler için)
    // ────────────────────────────────────────────────

    /**
     * Slug'a göre aktif mağazayı bul — kısa yol.
     * Tenant middleware tarafından her istekte çağrılır.
     */
    async findBySlug(slug: string) {
        const [tenant] = await this.listTenants(
            { slug, is_active: true },
            { take: 1 }
        )
        return tenant || null
    }

    /**
     * Domain'e göre aktif mağazayı bul.
     * Özel alan adı kullanıldığında tenant çözümleme için.
     */
    async findByDomain(domain: string) {
        const [tenant] = await this.listTenants(
            { domain, is_active: true },
            { take: 1 }
        )
        return tenant || null
    }

    /**
     * Belirli bir özelliğin bu mağazada aktif olup olmadığını kontrol et.
     */
    async hasFeature(tenantId: string, feature: TenantFeature): Promise<boolean> {
        const tenant = await this.retrieveTenant(tenantId) as any
        if (!tenant) return false
        const features: string[] = Array.isArray(tenant.features) ? tenant.features : []
        return features.includes(feature)
    }

    // ────────────────────────────────────────────────
    // AI Ajan Entegrasyon Metodları
    // ────────────────────────────────────────────────

    /**
     * AI ajanları için tenant bağlamını döndürür.
     *
     * Sektörel İçerik Ajanı (Gemma-2 27B):
     *   - tenant_id ile çağrılır, sektör ve ayarları alır
     *   - Sektöre göre ürün açıklaması üslubunu belirler
     *
     * Dinamik Müşteri Destek Ajanı (Llama-3.1 8B):
     *   - Müşterinin bağlı olduğu mağaza bağlamını alır
     *   - Stok politikaları, iletişim bilgileri, dil ayarlarını çeker
     *
     * @param tenantId - Mağaza ID'si
     * @returns Yapılandırılmış tenant bağlamı veya null
     */
    async getTenantContext(tenantId: string): Promise<TenantContext | null> {
        try {
            const tenant = await this.retrieveTenant(tenantId) as any
            if (!tenant || !tenant.is_active) return null

            const features: string[] = Array.isArray(tenant.features) ? tenant.features : []
            const settings = tenant.settings || {}

            return {
                tenant_id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                sector: tenant.sector as TenantSector,
                locale: settings.locale || "tr-TR",
                currency: settings.currency || "TRY",
                features,
                contact: settings.contact || null,
                theme: settings.theme || null,
                sectorConfig: this.getSectorConfig(tenant.sector),
            }
        } catch {
            this.logger_.warn(`[Tenant] getTenantContext başarısız: ${tenantId}`)
            return null
        }
    }

    /**
     * Sektöre özel yapılandırma — AI ajanlarının üslubunu belirler.
     *
     * Sektör tanımları artık `lib/sector-framework` içinde tek noktada
     * tutulur. Bu metod, geriye uyumluluk için eski `SectorConfig`
     * şeklini (tone/expertise/contentStyle/defaultTaxRate) korur.
     *
     * Bilinmeyen sektör için retail varsayılanına düşer; bu sayede
     * data hatası uygulamayı kırmaz, sadece muhafazakar tona geçer.
     */
    getSectorConfig(sector: string): SectorConfig {
        const code = SectorRegistry.isSupported(sector) ? sector : "retail"
        const cfg = SectorRegistry.get(code)
        return {
            tone: cfg.ai.tone,
            expertise: cfg.ai.expertise,
            contentStyle: cfg.ai.contentStyle,
            defaultTaxRate: cfg.defaultSettings.taxRate,
        }
    }
}

// ─── AI AJAN TİPLERİ ───

/**
 * AI ajanlarına aktarılan tenant bağlam bilgisi.
 * Tüm ajanlar bu yapıyı kullanarak mağaza-aware davranır.
 */
export interface TenantContext {
    tenant_id: string
    name: string
    slug: string
    sector: TenantSector
    locale: string
    currency: string
    features: string[]
    contact: { phone?: string; email?: string; address?: string } | null
    theme: { primaryColor?: string; secondaryColor?: string; logo?: string } | null
    sectorConfig: SectorConfig
}

/**
 * Sektöre özel AI davranış yapılandırması.
 */
export interface SectorConfig {
    /** AI'ın konuşma tonu */
    tone: string
    /** Uzmanlık alanı anahtar kelimeleri */
    expertise: string[]
    /** İçerik üretim stili */
    contentStyle: string
    /** Varsayılan KDV oranı */
    defaultTaxRate: number
}
