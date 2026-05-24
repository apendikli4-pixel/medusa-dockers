/**
 * Tenant AsyncLocalStorage — İstek Kapsamlı Tenant Context Deposu
 * ═══════════════════════════════════════════════════════════════
 *
 * Bu modül, Node.js'in native `AsyncLocalStorage` API'sini kullanarak
 * tenant bağlam bilgisini HTTP middleware'inden en derin veritabanı
 * katmanına kadar taşıyan, asenkron-güvenli bir depo sağlar.
 *
 * ─── NEDEN ASYNCLocalStorage? ───
 *
 * 1. Awilix (req.scope) Sınırlaması:
 *    req.scope sadece Express middleware zincirinde erişilebilir.
 *    MikroORM EventSubscriber'ları, Medusa workflow step'leri ve
 *    derin asenkron fonksiyon çağrılarında req.scope'a erişim yoktur.
 *
 * 2. MikroORM RequestContext Çakışması:
 *    Medusa V2, MikroORM'un RequestContext'ini kendi iç yapısı ile
 *    yönetir (@InjectManager, MedusaContext). Manuel RequestContext
 *    oluşturmak Medusa'nın transaction yönetimiyle çakışır.
 *
 * 3. AsyncLocalStorage Avantajları:
 *    - Node.js native API (ek bağımlılık yok)
 *    - Asenkron zincirde context kaybı olmaz (await, Promise, setTimeout)
 *    - MikroORM EventSubscriber'dan doğrudan okunabilir
 *    - Worker/Cron job'larda güvenli fallback (undefined = system)
 *    - V8 AsyncContextFrame ile ihmal edilebilir performans yükü
 *
 * ─── MİMARİ AKIŞ ───
 *
 * HTTP İsteği
 *   → tenantContextMiddleware (tenant çözümle)
 *   → tenantAlsMiddleware (ALS store'u başlat)
 *     → Route Handler
 *       → Service Method
 *         → MikroORM em.transactional()
 *           → TenantRlsSubscriber.afterTransactionStart()
 *             → getTenantId() ← ALS'den oku ← SET LOCAL çalıştır
 *
 * Worker/Cron (HTTP yok)
 *   → getTenantId() = undefined → SYSTEM_TENANT_ID kullanılır
 *
 * @see tenant-context.ts (Katman 1 — HTTP çözümleme)
 * @see tenant-rls.subscriber.ts (Katman 2 — transaction SET LOCAL)
 */

import { AsyncLocalStorage } from "node:async_hooks"

// ═══════════════════════════════════════════════════════════════
// TİP TANIMLARI
// ═══════════════════════════════════════════════════════════════

/**
 * AsyncLocalStorage içinde saklanan tenant store yapısı.
 * Immutable olarak tasarlanmıştır — set edildikten sonra değiştirilemez.
 */
export interface TenantStore {
    /** Çözümlenmiş tenant ID (UUID) */
    readonly tenantId: string
    /** Tenant'ın faaliyet sektörü */
    readonly sector: string
    /** İstek başlangıç zamanı (performans izleme) */
    readonly startedAt: number
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON STORE
// ═══════════════════════════════════════════════════════════════

/**
 * Global AsyncLocalStorage instance.
 * Tüm uygulama boyunca tek bir instance kullanılır.
 * Her HTTP isteği kendi izole store'unu `.run()` ile oluşturur.
 */
const tenantAsyncStorage = new AsyncLocalStorage<TenantStore>()

// ═══════════════════════════════════════════════════════════════
// OKUMA FONKSİYONLARI (tüm katmanlardan erişilebilir)
// ═══════════════════════════════════════════════════════════════

/**
 * Mevcut istek bağlamındaki tenant store'u döndürür.
 * HTTP isteği dışında (worker, cron, test) → undefined döner.
 *
 * @returns TenantStore veya undefined
 */
export function getTenantStore(): TenantStore | undefined {
    return tenantAsyncStorage.getStore()
}

/**
 * Mevcut istek bağlamındaki tenant ID'yi döndürür.
 * HTTP isteği dışında → undefined döner.
 *
 * Kullanım:
 *   const tenantId = getTenantId()
 *   if (!tenantId) {
 *     // system context (cron job, worker, vb.)
 *   }
 *
 * @returns tenant_id string veya undefined
 */
export function getTenantId(): string | undefined {
    return tenantAsyncStorage.getStore()?.tenantId
}

/**
 * Mevcut istek bağlamındaki sektör bilgisini döndürür.
 * AI ajanları ve içerik motorları bu fonksiyonu kullanır.
 *
 * @returns sector string veya undefined
 */
export function getTenantSector(): string | undefined {
    return tenantAsyncStorage.getStore()?.sector
}

// ═══════════════════════════════════════════════════════════════
// ÇALIŞTIRMA FONKSİYONU (middleware tarafından kullanılır)
// ═══════════════════════════════════════════════════════════════

/**
 * Verilen callback'i tenant context içinde çalıştırır.
 * Bu fonksiyon yalnızca middleware tarafından çağrılmalıdır.
 *
 * `store` değeri callback süresince tüm asenkron zincirde
 * erişilebilir olur. Callback bittiğinde store otomatik temizlenir.
 *
 * @param store - Tenant bağlam bilgisi (immutable)
 * @param callback - Context içinde çalıştırılacak fonksiyon
 * @returns Callback'in dönüş değeri
 */
export function runWithTenantContext<T>(
    store: TenantStore,
    callback: () => T
): T {
    return tenantAsyncStorage.run(store, callback)
}

/**
 * AsyncLocalStorage instance'ına doğrudan erişim.
 * Yalnızca test ve özel entegrasyon senaryoları için export edilir.
 * Normal kullanımda getTenantId() ve runWithTenantContext() tercih edilmeli.
 */
export { tenantAsyncStorage }
