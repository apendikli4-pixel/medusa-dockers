/**
 * Tenant DB Guard — Scope Kayıt Katmanı (Lightweight)
 * ═══════════════════════════════════════════════════════════════
 *
 * Bu middleware, tenant-context.ts tarafından çözümlenen tenant_id'yi
 * Awilix scope'a "currentTenantId" adıyla kaydeder.
 *
 * ─── MİMARİ NOT ───
 *
 * Bu middleware PostgreSQL'e doğrudan SET LOCAL ÇALIŞTIRMAZ.
 * SET LOCAL komutu, connection pool güvenliği nedeniyle
 * yalnızca aktif transaction içinde çalışmalıdır.
 *
 * Gerçek SET LOCAL işlemi şu katmanda yapılır:
 *   → src/modules/tenant/subscribers/tenant-rls.subscriber.ts
 *   → MikroORM EventSubscriber.beforeTransactionStart() hook'u
 *
 * Bu middleware'in tek görevi: tenant_id'yi scope'a kaydetmek.
 * EventSubscriber bu scope'tan okuyarak transaction başlangıcında
 * SET LOCAL uygular.
 *
 * Worker/Cron job senaryosu: HTTP isteği olmayan durumlarda
 * (arka plan işçileri, zamanlı görevler) scope'ta "currentTenantId"
 * bulunamaz. EventSubscriber bu durumda "system" atayarak
 * RLS bypass politikasını devreye sokar.
 *
 * @see tenant-context.ts (Katman 1 — tenant çözümleme)
 * @see tenant-rls.subscriber.ts (Katman 2 — transaction-level SET LOCAL)
 * @see Migration20260513120000.ts (RLS politikaları)
 */

import {
    MedusaNextFunction,
    MedusaRequest,
    MedusaResponse,
} from "@medusajs/framework/http"
import { Logger } from "@medusajs/framework/types"

/**
 * Tenant DB Guard Middleware
 *
 * tenantContextMiddleware'den SONRA çalışır.
 * Awilix scope'a "currentTenantId" string değerini kaydeder.
 * EventSubscriber bu değeri transaction başlangıcında okur.
 */
export const tenantDbGuardMiddleware = async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
): Promise<void> => {
    // tenantContext zaten tenant-context.ts tarafından scope'a kaydedildi.
    // Buradan tenant_id'yi çıkar ve ayrı bir "currentTenantId" key'i olarak
    // kaydet — EventSubscriber'ın okuması kolaylaşsın.
    const tenantId = req.tenantContext?.tenant_id ?? ""

    try {
        req.scope.register({
            currentTenantId: {
                resolve: (): string => tenantId,
            },
        })
    } catch (error: unknown) {
        // Scope kayıt hatası — loglayıp devam et.
        // RLS deny-all varsayılan olarak koruyacaktır.
        let logger: Logger | null = null
        try {
            logger = req.scope.resolve("logger")
        } catch { /* logger bile yoksa sessizce devam */ }

        if (logger) {
            logger.error(
                `[TenantDBGuard] Scope kayıt hatası: ` +
                `${error instanceof Error ? error.message : "Bilinmeyen hata"}`
            )
        }
    }

    return next()
}
