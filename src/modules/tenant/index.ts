/**
 * Tenant Modülü — Çoklu Mağaza Sistemi Giriş Noktası
 *
 * Bu modül, Medusa v2'nin Module() factory'si ile kaydedilir.
 * medusa-config.ts'te "tenant" adıyla referans verilir.
 *
 * Modül izolasyon ilkesi: Kendi DB tablolarına sahiptir,
 * diğer modüllerle iletişim defineLink veya remoteQuery ile yapılır.
 *
 * ─── LOADER'LAR ───
 * tenantIsolationFilterLoader: MikroORM Global Filter kaydı
 *   - Uygulama başlangıcında çalışır
 *   - em.find() gibi non-transactional READ'lerde tenant izolasyonu sağlar
 *   - ALS'den dinamik tenant_id okur
 *   - Worker/Cron bypass destekli (__system__)
 */
import TenantService from "./service"
import { Module } from "@medusajs/framework/utils"
import tenantIsolationFilterLoader from "./loaders/tenant-isolation-filter"
import tenantRlsSubscriberLoader from "./loaders/tenant-rls-subscriber"

/**
 * Modül adı sabiti — tüm projede tutarlı referans için kullanılır.
 * Container'dan resolve ederken: container.resolve("tenant")
 */
export const TENANT_MODULE = "tenant"

export default Module(TENANT_MODULE, {
    service: TenantService,
    loaders: [tenantIsolationFilterLoader, tenantRlsSubscriberLoader],
})

export { TenantService }
export type { TenantContext, SectorConfig } from "./service"
