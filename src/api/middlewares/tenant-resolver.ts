/**
 * Tenant Resolver Middleware — Çoklu Mağaza İstek Çözümleyici
 *
 * Bu middleware, gelen her isteğin hangi mağazaya (tenant) ait olduğunu belirler.
 * Çözümleme şu sırayla yapılır:
 *
 *   1. x-tenant-id header'ı (öncelikli — admin ve API çağrıları için)
 *   2. x-tenant-slug header'ı (storefront subdomain proxy için)
 *   3. Host header'ından özel domain çözümleme (www.example.com → tenant)
 *
 * Çözümlenen tenant bilgisi `req.tenant` ve `req.tenant_id` olarak
 * sonraki handler'lara aktarılır.
 *
 * Dürüstlük ilkesi:
 * - Tenant bulunamazsa istek reddedilmez, sadece tenant bilgisi null olur
 * - Her çözümleme denemesi loglanır (debug seviyesi)
 * - Hatalar açıklayıcı mesajlarla loglanır, istemciye iç detay verilmez
 * - Middleware asla sessizce başarısız olmaz (fail-open, log-always)
 *
 * Kapsam: Sadece /store/* ve /admin/* route'ları için çalışır.
 * /health, /healthz, /ready gibi altyapı endpoint'leri atlanır.
 */
import { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Logger } from "@medusajs/framework/types"
import { TENANT_MODULE } from "../../modules/tenant"
import type TenantService from "../../modules/tenant/service"

/**
 * Tenant çözümlemesi atlanacak path prefix'leri.
 * Bu endpoint'ler altyapı sağlık kontrolü içindir,
 * tenant bağlamına ihtiyaç duymazlar.
 */
const SKIP_PATHS = [
    "/health",
    "/healthz",
    "/ready",
    "/favicon.ico",
]

/**
 * req nesnesine tenant bilgisini eklemek için TypeScript tip genişletmesi.
 * Sonraki handler'lar req.tenant ve req.tenant_id'ye erişebilir.
 */
declare module "@medusajs/framework/http" {
    interface MedusaRequest {
        /** Çözümlenen tenant objesi (null = tenant belirlenemedi) */
        tenant?: any
        /** Çözümlenen tenant ID'si (kısa erişim) */
        tenant_id?: string
    }
}

/**
 * Tenant Resolver Middleware
 *
 * Akış:
 * 1. Path kontrolü — atlanacak endpoint mi?
 * 2. x-tenant-id header → doğrudan ID ile çözümle
 * 3. x-tenant-slug header → slug ile çözümle
 * 4. Host header → özel domain ile çözümle
 * 5. Hiçbiri bulunamazsa → tenant null, istek devam eder
 *
 * NOT: Bu middleware auth'dan ÖNCE çalışır, çünkü auth kontrolü
 * tenant bağlamından bağımsızdır. Sıralama middlewares.ts'te garanti edilir.
 */
export const tenantResolverMiddleware = async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
) => {
    // ─── 1. ATLANACAK PATH KONTROLÜ ───
    // Altyapı endpoint'leri tenant çözümlemesine ihtiyaç duymaz.
    const shouldSkip = SKIP_PATHS.some((prefix) => req.path.startsWith(prefix))
    if (shouldSkip) {
        return next()
    }

    let logger: Logger
    try {
        logger = req.scope.resolve("logger") as Logger
    } catch {
        // Logger bile çözümlenemiyorsa, sessizce devam et
        return next()
    }

    try {
        let tenantService: TenantService
        try {
            tenantService = req.scope.resolve(TENANT_MODULE) as TenantService
        } catch {
            // Tenant modülü henüz yüklenmemişse (migration öncesi vb.)
            // İsteği engellemeden devam et
            logger.debug("[TenantResolver] Tenant modülü henüz yüklenemedi, atlanıyor.")
            return next()
        }

        let resolvedTenant: any = null
        let resolveMethod = "none"

        // ─── 2. x-tenant-id HEADER İLE ÇÖZÜMLEME ───
        // Admin paneli ve API çağrıları bu header'ı gönderir.
        // En yüksek önceliğe sahiptir.
        const tenantIdHeader = req.headers["x-tenant-id"] as string | undefined
        if (tenantIdHeader) {
            try {
                resolvedTenant = await tenantService.retrieveTenant(tenantIdHeader)
                resolveMethod = "x-tenant-id"
            } catch {
                // ID ile tenant bulunamadı — diğer yöntemlere devam et
                logger.debug(`[TenantResolver] x-tenant-id "${tenantIdHeader}" ile tenant bulunamadı.`)
            }
        }

        // ─── 3. x-tenant-slug HEADER İLE ÇÖZÜMLEME ───
        // Storefront, subdomain bilgisini bu header ile iletir.
        // Sadece x-tenant-id yoksa veya çözümlenemezse kullanılır.
        if (!resolvedTenant) {
            const tenantSlugHeader = req.headers["x-tenant-slug"] as string | undefined
            if (tenantSlugHeader) {
                resolvedTenant = await tenantService.findBySlug(tenantSlugHeader)
                if (resolvedTenant) {
                    resolveMethod = "x-tenant-slug"
                } else {
                    logger.debug(`[TenantResolver] x-tenant-slug "${tenantSlugHeader}" ile tenant bulunamadı.`)
                }
            }
        }

        // ─── 4. HOST HEADER İLE ÇÖZÜMLEME (Özel Domain) ───
        // Tenant'ın özel alan adı varsa, Host header'ından çözümlenir.
        // Örn: www.antalya-havuz.com → ilgili tenant
        // Sadece yukarıdaki yöntemler sonuç vermediyse kullanılır.
        if (!resolvedTenant) {
            const hostHeader = req.headers["host"] as string | undefined
            if (hostHeader) {
                // Port numarasını çıkar (localhost:9000 → localhost)
                const domain = hostHeader.split(":")[0]

                // Bilinen yerel/geliştirme domain'lerini atla
                const isLocalDomain = [
                    "localhost",
                    "127.0.0.1",
                    "0.0.0.0",
                    "medusa-server",     // Docker internal
                ].includes(domain)

                if (!isLocalDomain) {
                    resolvedTenant = await tenantService.findByDomain(domain)
                    if (resolvedTenant) {
                        resolveMethod = "host-domain"
                    } else {
                        logger.debug(`[TenantResolver] Domain "${domain}" ile tenant bulunamadı.`)
                    }
                }
            }
        }

        // ─── 5. SONUCU REQUEST'E EKLE ───
        if (resolvedTenant) {
            // Aktiflik kontrolü — pasif mağazalar çözümlenmez
            if (!resolvedTenant.is_active) {
                logger.warn(
                    `[TenantResolver] Tenant "${resolvedTenant.slug}" pasif durumda, ` +
                    `istek tenant bağlamı olmadan devam edecek.`
                )
                req.tenant = null
                req.tenant_id = undefined
            } else {
                req.tenant = resolvedTenant
                req.tenant_id = resolvedTenant.id
                logger.debug(
                    `[TenantResolver] Tenant çözümlendi: "${resolvedTenant.name}" ` +
                    `(id: ${resolvedTenant.id}, yöntem: ${resolveMethod})`
                )
            }
        } else {
            // Tenant belirlenemedi — istek devam eder, tenant-aware route'lar
            // kendi içinde kontrol yapmalıdır
            req.tenant = null
            req.tenant_id = undefined
        }

        return next()

    } catch (error: unknown) {
        // ─── HATA YÖNETİMİ ───
        // Middleware hatası isteği ENGELLEMEZ — fail-open prensibi.
        // Hata loglanır, istek tenant bilgisi olmadan devam eder.
        // Bu, tek bir modül hatasının tüm platformu durdurmasını önler.
        logger.error(
            `[TenantResolver] Beklenmeyen hata: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`
        )
        req.tenant = null
        req.tenant_id = undefined
        return next()
    }
}
