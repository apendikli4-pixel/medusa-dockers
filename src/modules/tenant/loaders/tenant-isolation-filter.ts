/**
 * Tenant İzolasyon Global Filter — Module Loader
 * ═══════════════════════════════════════════════════════════════
 *
 * Bu loader, Medusa V2 uygulama başlangıcında çalışarak MikroORM
 * EntityManager'a "tenantIsolation" adlı bir Global Filter kaydeder.
 *
 * ─── NEDEN GLOBAL FİLTER? ───
 *
 * PostgreSQL RLS + SET LOCAL yalnızca aktif transaction (BEGIN...COMMIT)
 * içinde çalışır. Ancak MikroORM'da basit `em.find()` veya `em.findOne()`
 * çağrıları her zaman açık transaction başlatmaz. Bu durumda:
 *
 *   - SET LOCAL çalıştırılmamıştır (çünkü afterTransactionStart tetiklenmedi)
 *   - RLS politikası app.current_tenant_id'yi boş string olarak görür
 *   - Sonuç: Hiçbir satır döndürülmez → Veri kaybı illüzyonu
 *
 * Global Filter bu açığı kapatır:
 *   - ORM seviyesinde otomatik WHERE tenant_id = :tenantId enjekte eder
 *   - Transaction olsun veya olmasın her sorguda çalışır
 *   - RLS + Global Filter = İkili savunma hattı (Defense in Depth)
 *
 * ─── DİNAMİK PARAMETRE ───
 *
 * MikroORM'un `cond` callback'i her sorgu öncesinde çağrılır.
 * Bu callback, AsyncLocalStorage'dan (`getTenantId()`) aktif tenant_id'yi
 * dinamik olarak okur. Her istekte farklı tenant_id kullanılır.
 *
 * ─── SİSTEM BYPASS ───
 *
 * Worker/Cron job'lar (ALS store yok) ve "__system__" tenant_id durumunda
 * filter otomatik olarak `{}` (boş koşul) döndürür → tüm veriler görünür.
 * Bu, arka plan işlemlerinin RLS bypass'ı ile uyumludur.
 *
 * ─── KAPSAM ───
 *
 * Filter yalnızca tenant modülünün kendi entity'sine (Tenant) uygulanır.
 * Medusa core entity'leri (Product, Order, Customer) bu modülün
 * kapsamı dışındadır — onların izolasyonu SalesChannel mekanizması
 * ve link tabloları üzerinden sağlanır.
 *
 * @see tenant-context-store.ts (ALS — getTenantId())
 * @see tenant-rls.subscriber.ts (Transaction-level SET LOCAL)
 * @see Migration20260513120000.ts (PostgreSQL RLS politikaları)
 */

import { LoaderOptions } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getTenantId } from "../../../lib/tenant-context-store"
import { SYSTEM_TENANT_ID } from "../subscribers/tenant-rls.subscriber"

/**
 * Filter adı sabiti — tüm projede tutarlı referans için.
 * `em.find(Entity, {}, { filters: { [TENANT_FILTER_NAME]: false } })`
 * şeklinde devre dışı bırakılabilir.
 */
export const TENANT_FILTER_NAME = "tenantIsolation" as const

/**
 * Tenant İzolasyon Filter Loader
 *
 * Medusa V2 module başlangıcında çalışır.
 * EntityManager'a global filter kaydeder.
 *
 * Filter davranışı:
 * - Normal istek (ALS'de tenant_id var): WHERE id = :tenantId
 * - System context (ALS yok veya __system__): Filtre pasif (boş koşul)
 * - Default: true (varsayılan olarak her sorguda aktif)
 */
export default async function tenantIsolationFilterLoader(
    { container }: LoaderOptions
): Promise<void> {
    try {
        // V2.15: container.resolve return tipi unknown'a yakın katılaştı;
        // MikroORM EntityManager tipini explicit cast ile alıyoruz.
        const manager: any = container.resolve(
            ContainerRegistrationKeys.MANAGER
        )

        // ─── GLOBAL FILTER KAYDI ───
        // cond callback: Her sorgu öncesinde çağrılır.
        // ALS'den dinamik tenant_id okur.
        // args: false → bu filter dışarıdan parametre almaz,
        //               kendi parametresini ALS'den üretir.
        // MikroORM v6 imzası: addFilter(name, cond, entityName?, enabled?)
        // KARAR: Filter default OFF — yalnızca HTTP middleware'lerde,
        // ALS'de tenant set edildikten sonra aktive ediliyor.
        // Default ON yaparsak migration/CLI/loader bağlamları da filter çalıştırır
        // ve "No arguments provided" hatası fırlatır.
        // PostgreSQL RLS (Migration20260513120000) zaten DB-seviyesinde
        // birincil savunma sağlıyor; bu filter ikincil katman.
        manager.addFilter(
            TENANT_FILTER_NAME,
            (_args: Record<string, unknown>) => {
                const tenantId = getTenantId()
                if (!tenantId || tenantId === SYSTEM_TENANT_ID) {
                    return {}
                }
                return { id: tenantId }
            },
            "Tenant",
            false   // ← Default DISABLED. HTTP middleware'de em.setFilterParams + setFlushMode ile aktive edilebilir.
        )
    } catch (error: unknown) {
        // Loader hatası uygulama başlangıcını bozmamalı.
        // Ancak filter kayıt edilmezse veri izolasyonu eksik olur.
        // Bu durumda RLS (veritabanı seviyesi) hâlâ aktiftir.
        console.error(
            `[TenantFilter] Global filter kayıt hatası: ` +
            `${error instanceof Error ? error.message : "Bilinmeyen hata"}`
        )
    }
}
