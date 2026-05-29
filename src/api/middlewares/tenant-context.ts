/**
 * Tenant Context Middleware — Çekirdek Veri İzolasyon Kapısı (Fail-Closed)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Bu middleware, Mirror Core SaaS platformunun veri izolasyonunun
 * İLK VE EN KRİTİK kapısıdır. Gelen her isteğin hangi mağazaya
 * (tenant) ait olduğunu belirler ve bu bilgiyi Medusa V2'nin
 * Awilix tabanlı bağımlılık enjeksiyon sistemine (request scope)
 * DEĞİŞMEZ (immutable) bir değişken olarak kaydeder.
 *
 * ─── MİMARİ PRENSİPLER ───
 *
 * 1. FAIL-CLOSED (Kesin Red):
 *    tenant_id tespit edilemezse → 400 Bad Request
 *    tenant aktif değilse → 403 Forbidden
 *    ASLA varsayılan tenant atanmaz, ASLA istek geçirilmez.
 *
 * 2. ÇÖZÜMLEME HİYERARŞİSİ (Resolution Hierarchy):
 *    a) x-tenant-id HTTP Header (en yüksek öncelik — admin/API çağrıları)
 *    b) x-tenant-slug HTTP Header (slug tabanlı — storefront proxy)
 *    c) JWT token payload'undaki tenant claim (auth sonrası)
 *    d) Host/Origin header'ından domain/subdomain tespiti
 *
 * 3. BAĞIMLILIK ENJEKSİYONU (DI — Immutable):
 *    Çözümlenen tenant_id, `req.scope.register()` ile Awilix container'a
 *    "tenantContext" adıyla kaydedilir. Bu değer:
 *    - Sonraki middleware'ler, route handler'lar ve servisler tarafından okunur
 *    - PostgreSQL RLS politikaları bu değeri SET LOCAL ile kullanır
 *    - Repository katmanı bu değeri Global Scope olarak uygular
 *
 * 4. TİP GÜVENLİĞİ:
 *    req nesnesine eklenen tüm alanlar global interface tanımlaması ile
 *    tip-güvenlidir. `any` kullanımı YASAKTIR.
 *
 * @see GENESIS_PROTOCOL kuralı: "Strict API Security (Zod)"
 * @see GENESIS_PROTOCOL kuralı: "No error internals in responses"
 * @see Ajan Anayasası MADDE 5: "SaaS (Shopify Alternatifi) Vizyonu"
 */

import {
    MedusaNextFunction,
    MedusaRequest,
    MedusaResponse,
} from "@medusajs/framework/http"
import { Logger } from "@medusajs/framework/types"
import { TENANT_MODULE } from "../../modules/tenant"
import type TenantService from "../../modules/tenant/service"

// ═══════════════════════════════════════════════════════════════
// TİP TANIMLARI (Type Definitions)
// ═══════════════════════════════════════════════════════════════

/**
 * Çözümlenmiş tenant bağlam nesnesi.
 * Awilix container'a "tenantContext" adıyla kaydedilir.
 * Tüm downstream servisler bu tipi kullanarak tenant verisine erişir.
 *
 * Object.freeze() ile dondurularak runtime'da mutasyona karşı korunur.
 */
export interface ResolvedTenantContext {
    /** Tenant'ın benzersiz ID'si (UUID) — değişmez */
    readonly tenant_id: string
    /** Tenant'ın URL slug'ı */
    readonly slug: string
    /** Tenant'ın görünen adı */
    readonly name: string
    /** Faaliyet sektörü */
    readonly sector: string
    /** Tenant'ın aktif olup olmadığı */
    readonly is_active: boolean
    /** Çözümleme yöntemi — hata ayıklama ve denetim için */
    readonly resolved_via: TenantResolveMethod
    /** Çözümleme zaman damgası (ISO 8601) */
    readonly resolved_at: string
}

/**
 * Tenant çözümleme yöntemi.
 * Audit log ve hata ayıklama için hangi katmandan çözümlendiğini belirtir.
 */
export type TenantResolveMethod =
    | "x-tenant-id"     // HTTP header ile doğrudan ID
    | "x-tenant-slug"   // HTTP header ile slug
    | "jwt-claim"       // JWT token payload'undaki tenant bilgisi
    | "host-domain"     // Host/Origin header'ından domain çözümleme

/**
 * TypeScript tip genişletmesi — MedusaRequest'e tenant bilgisi ekleme.
 *
 * Bu tanımlama, tüm projede req.tenantContext ve req.tenant_id
 * kullanımının tip-güvenli olmasını sağlar.
 *
 * NOT: Eski `req.tenant` (any tipli) kullanımı kademeli olarak
 * kaldırılacak, yerini bu tip-güvenli yapıya bırakacaktır.
 */
declare module "@medusajs/framework/http" {
    interface MedusaRequest {
        /**
         * Çözümlenmiş ve doğrulanmış tenant bağlamı.
         * Fail-Closed middleware tarafından garanti edilir:
         * - Bu değer varsa, tenant geçerli ve aktiftir
         * - Bu değer yoksa, istek zaten 400/403 ile reddedilmiştir
         */
        tenantContext?: ResolvedTenantContext
    }
}

// ═══════════════════════════════════════════════════════════════
// KONFİGÜRASYON SABİTLERİ
// ═══════════════════════════════════════════════════════════════

/**
 * Tenant çözümlemesi ATLANACAK path prefix'leri.
 * Bu endpoint'ler altyapı sağlık kontrolü veya auth flow'u içindir;
 * tenant bağlamına ihtiyaç duymazlar.
 */
const TENANT_EXEMPT_PATHS: readonly string[] = [
    "/health",
    "/healthz",
    "/ready",
    "/favicon.ico",
    "/store/auth",      // Kimlik doğrulama akışı — tenant bağlamı gerektirmez
    "/admin/auth",      // Admin kimlik doğrulama akışı
    "/admin/tenants",   // Tenant CRUD — kendi kendini yönetim (super-admin)
    "/admin/setup",     // İlk kurulum endpoint'i
]

/**
 * Bilinen yerel/geliştirme domain'leri.
 * Bu domain'ler Host header ile tenant çözümlemede atlanır.
 */
const LOCAL_DOMAINS: readonly string[] = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "medusa-server",    // Docker internal network
    "medusa_server_core_v2", // Docker container name
]

/**
 * Awilix container'a kaydedilecek tenant context anahtarı.
 * Downstream servisler bu anahtar ile tenant bilgisine erişir:
 *   const ctx = container.resolve("tenantContext")
 */
const TENANT_CONTEXT_REGISTRATION_KEY = "tenantContext" as const

// ═══════════════════════════════════════════════════════════════
// ANA MİDDLEWARE
// ═══════════════════════════════════════════════════════════════

/**
 * Tenant Context Middleware — Fail-Closed Veri İzolasyon Kapısı
 *
 * Akış:
 * 1. Path kontrolü → muaf mı?
 * 2. Çözümleme hiyerarşisi → x-tenant-id → x-tenant-slug → JWT → Host
 * 3. Aktiflik kontrolü → pasif tenant = 403
 * 4. Immutable context oluştur → Object.freeze()
 * 5. Awilix scope'a kaydet → req.scope.register()
 * 6. Request'e ekle → req.tenantContext, req.tenant_id
 *
 * Başarısız durumlar:
 * - Tenant çözümlenemedi → 400 Bad Request (isteği bloke et)
 * - Tenant pasif → 403 Forbidden (isteği bloke et)
 * - Tenant modülü henüz yüklenmemiş → 503 Service Unavailable
 */
export const tenantContextMiddleware = async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
): Promise<void> => {
    // ─── 1. MUAF PATH KONTROLÜ ───
    // Altyapı ve auth endpoint'leri tenant bağlamına ihtiyaç duymaz.
    const isExempt = TENANT_EXEMPT_PATHS.some((prefix) =>
        req.path.startsWith(prefix)
    )
    if (isExempt) {
        return next()
    }

    // Logger'ı çözümle — hata durumunda bile log tutulmalı
    let logger: Logger
    try {
        logger = req.scope.resolve("logger")
    } catch {
        // Logger bile çözümlenemiyorsa, container ciddi şekilde bozuk.
        // Güvenlik prensibi: bilinmeyen durumda isteği reddet.
        res.status(503).json({
            error: "Sistem geçici olarak kullanılamıyor.",
            code: "TENANT_SYSTEM_UNAVAILABLE",
        })
        return
    }

    // ─── 2. TENANT SERVİSİNİ ÇÖZÜMLE ───
    let tenantService: TenantService
    try {
        tenantService = req.scope.resolve(TENANT_MODULE)
    } catch {
        logger.error(
            "[TenantContext] Tenant modülü çözümlenemedi. " +
            "Migration çalıştırılmamış veya modül kayıtlı değil olabilir."
        )
        res.status(503).json({
            error: "Mağaza sistemi geçici olarak kullanılamıyor.",
            code: "TENANT_MODULE_UNAVAILABLE",
        })
        return
    }

    // ─── 3. ÇÖZÜMLEME HİYERARŞİSİ ───
    // Sırasıyla: Header ID → Header Slug → JWT Claim → Host Domain
    const resolveResult = await resolveTenantFromRequest(
        req,
        tenantService,
        logger
    )

    if (!resolveResult.success) {
        // FAIL-CLOSED: Tenant çözümlenemedi → isteği bloke et
        logger.warn(
            `[TenantContext] FAIL-CLOSED: İstek reddedildi. ` +
            `Path: ${req.path}, Sebep: ${resolveResult.reason}`
        )
        res.status(400).json({
            error: "Mağaza bilgisi tespit edilemedi. " +
                "x-tenant-id veya x-tenant-slug header'ı gereklidir.",
            code: "TENANT_NOT_RESOLVED",
        })
        return
    }

    const tenant = resolveResult.tenant

    // ─── 4. AKTİFLİK KONTROLÜ ───
    if (!tenant.is_active) {
        logger.warn(
            `[TenantContext] FAIL-CLOSED: Pasif tenant erişim denemesi. ` +
            `Tenant: "${tenant.name}" (${tenant.id}), Path: ${req.path}`
        )
        res.status(403).json({
            error: "Bu mağaza şu anda aktif değildir.",
            code: "TENANT_INACTIVE",
        })
        return
    }

    // ─── 5. DEĞİŞMEZ (IMMUTABLE) CONTEXT OLUŞTUR ───
    const tenantContext: ResolvedTenantContext = Object.freeze({
        tenant_id: tenant.id as string,
        slug: tenant.slug as string,
        name: tenant.name as string,
        sector: (tenant.sector as string) || "retail",
        is_active: true,
        resolved_via: resolveResult.method,
        resolved_at: new Date().toISOString(),
    })

    // ─── 6. AWILIX SCOPE'A KAYDET (Dependency Injection) ───
    // Downstream servisler (Repository, RLS, AI Agent) bu değeri
    // container.resolve("tenantContext") ile okuyacak.
    req.scope.register({
        [TENANT_CONTEXT_REGISTRATION_KEY]: {
            resolve: (): ResolvedTenantContext => tenantContext,
        },
    })

    // ─── 7. REQUEST NESNESİNE EKLE ───
    // Eski req.tenant / req.tenant_id ile geriye uyumluluk
    // + yeni tip-güvenli req.tenantContext
    req.tenantContext = tenantContext
    req.tenant_id = tenantContext.tenant_id
    req.tenant = tenant  // Eski kod uyumluluğu — kademeli olarak kaldırılacak

    logger.debug(
        `[TenantContext] ✓ Tenant çözümlendi: "${tenantContext.name}" ` +
        `(id: ${tenantContext.tenant_id}, yöntem: ${tenantContext.resolved_via})`
    )

    return next()
}

// ═══════════════════════════════════════════════════════════════
// ÇÖZÜMLEME FONKSİYONLARI (Resolver Functions)
// ═══════════════════════════════════════════════════════════════

/**
 * Tenant çözümleme sonucu.
 * Başarılı veya başarısız durumu açıkça belirtir (Union Type).
 */
type TenantResolveResult =
    | {
          success: true
          tenant: TenantRecord
          method: TenantResolveMethod
      }
    | {
          success: false
          reason: string
      }

/**
 * Tenant veritabanı kaydı — TenantService'den dönen tip.
 * `any` kullanmamak için minimal bir arayüz tanımlanır.
 */
interface TenantRecord {
    id: string
    name: string
    slug: string
    sector: string
    is_active: boolean
    domain: string | null
    settings: Record<string, unknown> | null
    features: string[] | unknown
    owner_id: string | null
    metadata: Record<string, unknown> | null
}

/**
 * İstek üzerinden tenant'ı çözümleyen ana fonksiyon.
 * Çözümleme hiyerarşisini sırasıyla dener.
 * İlk başarılı sonuçta durur (early return).
 *
 * @param req - Medusa isteği
 * @param tenantService - Tenant modül servisi
 * @param logger - Medusa logger
 * @returns Çözümleme sonucu (başarılı veya başarısız)
 */
async function resolveTenantFromRequest(
    req: MedusaRequest,
    tenantService: TenantService,
    logger: Logger
): Promise<TenantResolveResult> {

    // ─── KATMAN 1: x-tenant-id Header ───
    // En yüksek öncelik. Admin paneli ve doğrudan API çağrıları bu header'ı gönderir.
    const tenantIdHeader = extractHeader(req, "x-tenant-id")
    if (tenantIdHeader) {
        const tenant = await safeRetrieveTenant(
            tenantService,
            tenantIdHeader,
            logger
        )
        if (tenant) {
            return { success: true, tenant, method: "x-tenant-id" }
        }
        logger.debug(
            `[TenantContext] x-tenant-id "${tenantIdHeader}" ile tenant bulunamadı.`
        )
    }

    // ─── KATMAN 2: x-tenant-slug Header ───
    // Storefront proxy (Next.js middleware) bu header'ı gönderir.
    const tenantSlugHeader = extractHeader(req, "x-tenant-slug")
    if (tenantSlugHeader) {
        const tenant = await safeFindBySlug(
            tenantService,
            tenantSlugHeader,
            logger
        )
        if (tenant) {
            return { success: true, tenant, method: "x-tenant-slug" }
        }
        logger.debug(
            `[TenantContext] x-tenant-slug "${tenantSlugHeader}" ile tenant bulunamadı.`
        )
    }

    // ─── KATMAN 3: JWT Token Claim ───
    // Auth middleware çalıştıysa, token'daki tenant bilgisini kontrol et.
    const jwtTenantId = extractTenantFromAuthContext(req)
    if (jwtTenantId) {
        const tenant = await safeRetrieveTenant(
            tenantService,
            jwtTenantId,
            logger
        )
        if (tenant) {
            return { success: true, tenant, method: "jwt-claim" }
        }
        logger.debug(
            `[TenantContext] JWT claim tenant_id "${jwtTenantId}" ile tenant bulunamadı.`
        )
    }

    // ─── KATMAN 4: Host/Origin Header (Domain Çözümleme) ───
    // Özel alan adı kullanan mağazalar için.
    const hostHeader = extractHeader(req, "host")
    if (hostHeader) {
        const domain = hostHeader.split(":")[0] // Port numarasını çıkar
        const isLocal = LOCAL_DOMAINS.includes(domain)

        if (!isLocal) {
            const tenant = await safeFindByDomain(
                tenantService,
                domain,
                logger
            )
            if (tenant) {
                return { success: true, tenant, method: "host-domain" }
            }
            logger.debug(
                `[TenantContext] Domain "${domain}" ile tenant bulunamadı.`
            )
        }
    }

    // ─── KATMAN 5: DEFAULT_TENANT_ID Env Fallback ───
    // Single-tenant deployment veya ilk kurulum için: header yoksa env'deki
    // varsayılan tenant ID'sini retrieve et. Multi-tenant moda geçildiğinde
    // bu env değişkenini boşaltarak header zorunluluğunu geri getir.
    const defaultTenantId = process.env.DEFAULT_TENANT_ID
    if (defaultTenantId && defaultTenantId.trim().length > 0) {
        const tenant = await safeRetrieveTenant(
            tenantService,
            defaultTenantId.trim(),
            logger
        )
        if (tenant) {
            return { success: true, tenant, method: "x-tenant-id" }
        }
    }

    // ─── ÇÖZÜMLEME BAŞARISIZ ───
    // Tüm katmanlar denendi, hiçbiri sonuç vermedi.
    return {
        success: false,
        reason:
            "Hiçbir çözümleme katmanı tenant tespit edemedi. " +
            `Headers: x-tenant-id=${tenantIdHeader || "yok"}, ` +
            `x-tenant-slug=${tenantSlugHeader || "yok"}, ` +
            `host=${hostHeader || "yok"}`,
    }
}

// ═══════════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR (Utility Functions)
// ═══════════════════════════════════════════════════════════════

/**
 * HTTP header değerini güvenli şekilde çıkarır.
 * Array dönerse ilk elemanı alır, string dönerse doğrudan kullanır.
 * Boş string veya undefined durumunda null döner.
 */
function extractHeader(
    req: MedusaRequest,
    headerName: string
): string | null {
    const raw = req.headers[headerName]
    if (!raw) return null

    const value = Array.isArray(raw) ? raw[0] : raw
    return value && value.trim().length > 0 ? value.trim() : null
}

/**
 * Auth context'ten tenant bilgisini çıkarır.
 * Medusa V2'de auth_context.app_metadata içindeki tenant_id claim'i kontrol edilir.
 */
function extractTenantFromAuthContext(req: MedusaRequest): string | null {
    const authContext = req.auth_context
    if (!authContext) return null

    // Medusa V2 auth_context.app_metadata alanında özel claim'ler saklanabilir
    const appMetadata = (authContext as Record<string, unknown>).app_metadata
    if (
        appMetadata &&
        typeof appMetadata === "object" &&
        appMetadata !== null
    ) {
        const tenantId = (appMetadata as Record<string, unknown>).tenant_id
        if (typeof tenantId === "string" && tenantId.length > 0) {
            return tenantId
        }
    }

    return null
}

/**
 * Tenant'ı ID ile güvenli şekilde getirir.
 * Hata durumunda null döner, asla fırlatmaz (exception swallow).
 */
async function safeRetrieveTenant(
    tenantService: TenantService,
    tenantId: string,
    logger: Logger
): Promise<TenantRecord | null> {
    try {
        const tenant = await tenantService.retrieveTenant(tenantId)
        if (!tenant) {
            logger.warn(`[TenantContext] retrieveTenant("${tenantId}") null döndürdü.`)
            return null
        }
        return tenant as TenantRecord
    } catch (error: unknown) {
        logger.warn(
            `[TenantContext] retrieveTenant("${tenantId}") exception: ` +
            `${error instanceof Error ? error.message : "Bilinmeyen hata"}`
        )
        return null
    }
}

/**
 * Tenant'ı slug ile güvenli şekilde bulur.
 * Sadece aktif tenant'ları döndürür (findBySlug zaten is_active filtresi uygular).
 */
async function safeFindBySlug(
    tenantService: TenantService,
    slug: string,
    logger: Logger
): Promise<TenantRecord | null> {
    try {
        const tenant = await tenantService.findBySlug(slug)
        return tenant ? (tenant as TenantRecord) : null
    } catch (error: unknown) {
        logger.debug(
            `[TenantContext] findBySlug("${slug}") hatası: ` +
            `${error instanceof Error ? error.message : "Bilinmeyen hata"}`
        )
        return null
    }
}

/**
 * Tenant'ı domain ile güvenli şekilde bulur.
 * Özel alan adı kullanan mağazalar için kullanılır.
 */
async function safeFindByDomain(
    tenantService: TenantService,
    domain: string,
    logger: Logger
): Promise<TenantRecord | null> {
    try {
        const tenant = await tenantService.findByDomain(domain)
        return tenant ? (tenant as TenantRecord) : null
    } catch (error: unknown) {
        logger.debug(
            `[TenantContext] findByDomain("${domain}") hatası: ` +
            `${error instanceof Error ? error.message : "Bilinmeyen hata"}`
        )
        return null
    }
}
