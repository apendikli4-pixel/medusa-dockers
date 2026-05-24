/**
 * Tenant RLS EventSubscriber — Transaction-Level Veri İzolasyonu
 * ═══════════════════════════════════════════════════════════════
 *
 * Bu EventSubscriber, Mirror Core SaaS platformunun veri izolasyonunun
 * EN KRİTİK çekirdek bileşenidir. Her veritabanı transaction'ının
 * başlangıcında `SET LOCAL app.current_tenant_id` komutunu çalıştırır.
 *
 * ─── VERI AKIŞI ───
 *
 * HTTP İsteği:
 *   tenantContextMiddleware → tenantAlsMiddleware → ALS store aktif
 *   → Service em.transactional() → BEGIN
 *   → afterTransactionStart() → getTenantId() → ALS'den oku
 *   → SET LOCAL app.current_tenant_id = 'xxx'
 *   → SQL sorguları RLS ile filtrelenir
 *   → COMMIT/ROLLBACK → SET LOCAL otomatik sıfırlanır
 *
 * Worker/Cron (HTTP yok):
 *   → getTenantId() = undefined (ALS store yok)
 *   → SET LOCAL app.current_tenant_id = '__system__'
 *   → RLS bypass politikası devreye girer
 *
 * ─── CONNECTION POOL GÜVENLİĞİ ───
 *
 * SET LOCAL yalnızca aktif transaction (BEGIN...COMMIT) içinde
 * geçerlidir. Transaction sona erdiğinde PostgreSQL otomatik
 * olarak değişkeni sıfırlar. Bağlantı havuza temiz döner.
 *
 * @see tenant-context-store.ts (ALS store — getTenantId())
 * @see tenant-als.ts (ALS middleware — store başlatıcı)
 * @see Migration20260513120000.ts (RLS politikaları)
 */

import type {
    EventSubscriber,
    TransactionEventArgs,
} from "@mikro-orm/core"
import { getTenantId } from "../../../lib/tenant-context-store"

/**
 * Sistem işlemleri için kullanılan özel tenant ID.
 * RLS politikalarında bu değer bypass olarak tanınır.
 * Worker'lar, cron job'lar ve migration'lar bu ID ile çalışır.
 */
export const SYSTEM_TENANT_ID = "__system__" as const

/**
 * TenantRlsSubscriber — MikroORM Transaction Lifecycle Hook
 *
 * Her transaction başladığında (afterTransactionStart), aktif
 * bağlantı üzerinde SET LOCAL çalıştırarak PostgreSQL RLS
 * politikalarını o transaction için aktifleştirir.
 *
 * Tenant ID kaynağı: AsyncLocalStorage (getTenantId())
 * - HTTP isteği varsa → middleware tarafından ALS'ye kaydedilmiş tenant_id
 * - Worker/Cron → ALS store yok → SYSTEM_TENANT_ID
 */
export class TenantRlsSubscriber implements EventSubscriber {

    /**
     * Transaction başladıktan hemen sonra tetiklenir.
     * Bu noktada PostgreSQL'de BEGIN komutu zaten çalışmıştır.
     * SET LOCAL bu transaction bağlantısı üzerinde güvenle çalışır.
     */
    async afterTransactionStart(args: TransactionEventArgs): Promise<void> {
        // ─── 1. TENANT ID'Yİ AsyncLocalStorage'DAN OKU ───
        // HTTP isteği varsa: tenantAlsMiddleware tarafından kaydedilmiş
        // Worker/Cron: ALS store yok → undefined → system bypass
        const tenantId = getTenantId() ?? SYSTEM_TENANT_ID

        // ─── 2. SET LOCAL — Transaction Bağlantısına Tenant Enjekte Et ───
        // SQL injection önlemi: tek tırnak escape edilir.
        // SET LOCAL yalnızca bu transaction süresince geçerlidir.
        // COMMIT/ROLLBACK sonrasında otomatik sıfırlanır.
        try {
            const connection = args.em.getConnection()
            const sanitizedId = tenantId.replace(/'/g, "''")
            await connection.execute(
                `SET LOCAL app.current_tenant_id = '${sanitizedId}'`
            )
        } catch (error: unknown) {
            // SET LOCAL başarısız olursa:
            // - Hata logla
            // - Transaction devam etsin (throw yapmak tüm işlemi kırar)
            // - RLS deny-all varsayılanı (boş string) koruyacaktır
            //   çünkü SET LOCAL başarısız olunca eski değer (boş) kalır
            console.error(
                `[TenantRLS] SET LOCAL başarısız (tenantId: ${tenantId}): ` +
                `${error instanceof Error ? error.message : "Bilinmeyen hata"}`
            )
        }
    }
}
