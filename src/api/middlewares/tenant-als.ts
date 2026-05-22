/**
 * Tenant ALS Middleware — AsyncLocalStorage Bağlam Başlatıcı
 * ═══════════════════════════════════════════════════════════════
 *
 * Bu middleware, tenantContextMiddleware tarafından çözümlenen
 * tenant bilgisini Node.js AsyncLocalStorage deposuna kaydeder.
 * Bu sayede tenant_id, Express middleware zincirinin ötesinde —
 * MikroORM EventSubscriber'larında, Medusa Workflow step'lerinde
 * ve derin asenkron fonksiyon çağrılarında — erişilebilir olur.
 *
 * ─── SIRA ───
 * tenantContextMiddleware → tenantAlsMiddleware → tenantDbGuardMiddleware → ...
 *
 * ─── ÖNEMLİ ───
 * Bu middleware `runWithTenantContext()` ile `next()`'i ALS
 * scope'u içinde çağırır. Bu sayede `next()`'ten sonra çalışan
 * tüm handler'lar, servisler ve subscriber'lar aynı ALS bağlamını
 * paylaşır.
 *
 * @see tenant-context-store.ts (ALS store tanımı)
 * @see tenant-rls.subscriber.ts (ALS'den okuyan EventSubscriber)
 */

import {
    MedusaNextFunction,
    MedusaRequest,
    MedusaResponse,
} from "@medusajs/framework/http"
import {
    runWithTenantContext,
    type TenantStore,
} from "../../lib/tenant-context-store"

/**
 * Tenant ALS Middleware
 *
 * tenantContextMiddleware'den SONRA çalışır.
 * req.tenantContext mevcutsa → ALS store'u başlatır.
 * req.tenantContext yoksa → ALS store başlatılmaz (worker/system context).
 */
export const tenantAlsMiddleware = (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
): void => {
    const tenantContext = req.tenantContext

    if (!tenantContext) {
        // Tenant çözümlenmemiş — muaf path veya çözümleme sonrası
        // tenantContextMiddleware zaten 400 döndürmüş olmalı.
        // Buraya ulaştıysa, muaf bir path'tir → ALS başlatma.
        return next()
    }

    // ─── ALS STORE OLUŞTUR (Immutable) ───
    const store: TenantStore = Object.freeze({
        tenantId: tenantContext.tenant_id,
        sector: tenantContext.sector,
        startedAt: Date.now(),
    })

    // ─── ALS SCOPE İÇİNDE next() ÇAĞIR ───
    // Bu noktadan itibaren tüm asenkron zincir (route handler,
    // service method, MikroORM subscriber) aynı store'a erişir.
    runWithTenantContext(store, () => {
        next()
    })
}
