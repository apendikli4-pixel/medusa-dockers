/**
 * PostgreSQL Row-Level Security (RLS) Migration — Çekirdek Veri İzolasyonu
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Bu migration, Mirror Core SaaS platformunun veri izolasyonunun
 * İKİNCİ KRİTİK KATMANINI oluşturur.
 *
 * ─── MİMARİ ───
 *
 * Katman 1: Tenant Context Middleware (Application Level)
 * Katman 2: PostgreSQL RLS (Database Level) ← BU MIGRATION
 * Katman 3: MikroORM EventSubscriber (Transaction Level)
 *
 * ─── RLS POLİTİKA KURALLARI ───
 *
 * 1. Her politika `current_setting('app.current_tenant_id', true)`
 *    değerini kontrol eder. Bu değer, MikroORM EventSubscriber
 *    tarafından her transaction başlangıcında SET LOCAL ile atanır.
 *
 * 2. Boş string ('') = deny-all → Hiçbir satır döndürülmez.
 *    Bu, fail-closed prensibidir. tenant_id atanmadan veri okunamaz.
 *
 * 3. '__system__' = bypass → Tüm satırlar görünür.
 *    Worker'lar, cron job'lar ve migration'lar bu değerle çalışır.
 *    HTTP isteklerinde bu değer ASLA kullanılmaz.
 *
 * 4. Link tabloları (tenant_product, tenant_order) SalesChannel mimarisine
 *    geçiş nedeniyle devre dışı bırakılmıştır. RLS, aktif olan
 *    tenant_customer, tenant_sales_channel, tenant_api_key ve
 *    tenant_stock_location link tablolarına uygulanır.
 *
 * ─── PERFORMANS ───
 *
 * RLS politikaları her sorguya ek WHERE koşulu ekler.
 * Bu koşulların performans kaybı yaratmaması için,
 * filtrelenen kolonlara (tenant_id) B-Tree index'leri eklenir.
 *
 * ─── GÜVENLİK ───
 *
 * Uygulama veritabanı kullanıcısının BYPASSRLS yetkisine sahip
 * OLMAMASI gerekir. Production'da ayrı bir düşük yetkili DB user
 * oluşturulmalıdır. Migration'lar ve DDL komutları superuser ile
 * çalıştırılır.
 *
 * @see tenant-rls.subscriber.ts (SET LOCAL — transaction hook)
 * @see tenant-context.ts (HTTP tenant çözümleme)
 */
import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260513120000 extends Migration {

    override async up(): Promise<void> {
        // ═══════════════════════════════════════════════════════════
        // 1. PostgreSQL GUC Değişkeni — Varsayılan Değer
        //    Boş string = deny-all (güvenli varsayılan)
        // ═══════════════════════════════════════════════════════════

        // NOT: `ALTER DATABASE CURRENT` PostgreSQL'de geçerli değil — `CURRENT`
        // gerçek bir DB ismi sanılır. current_database()'i dinamik SQL ile
        // interpole ediyoruz.
        this.addSql(`
            DO $$
            BEGIN
                EXECUTE format('ALTER DATABASE %I SET app.current_tenant_id = %L', current_database(), '');
            END$$;
        `)

        // ═══════════════════════════════════════════════════════════
        // 2. TENANT TABLOSU — RLS + İndex
        // ═══════════════════════════════════════════════════════════

        this.addSql(`
            ALTER TABLE "tenant" ENABLE ROW LEVEL SECURITY;
        `)

        // Politika: Tenant kendi kaydını görebilir VEYA system bypass.
        // Boş string durumunda: tenant tablosunun okunabilmesi gerekir
        // (tenant çözümleme sırasında). Bu nedenle boş string'e de izin verilir.
        // Asıl izolasyon link tablolarında sağlanır.
        this.addSql(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE tablename = 'tenant' AND policyname = 'rls_tenant_isolation'
                ) THEN
                    CREATE POLICY "rls_tenant_isolation" ON "tenant"
                    FOR ALL
                    USING (
                        current_setting('app.current_tenant_id', true) = ''
                        OR "id" = current_setting('app.current_tenant_id', true)
                        OR current_setting('app.current_tenant_id', true) = '__system__'
                    );
                END IF;
            END
            $$;
        `)

        // ═══════════════════════════════════════════════════════════
        // 3. TENANT-CUSTOMER LİNK TABLOSU — RLS + İndex
        // ═══════════════════════════════════════════════════════════

        this.addSql(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'tenant_customer' AND table_schema = 'public'
                ) THEN
                    ALTER TABLE "tenant_customer" ENABLE ROW LEVEL SECURITY;

                    IF NOT EXISTS (
                        SELECT 1 FROM pg_policies
                        WHERE tablename = 'tenant_customer'
                        AND policyname = 'rls_tenant_customer_isolation'
                    ) THEN
                        CREATE POLICY "rls_tenant_customer_isolation"
                        ON "tenant_customer"
                        FOR ALL
                        USING (
                            "tenant_id" = current_setting('app.current_tenant_id', true)
                            OR current_setting('app.current_tenant_id', true) = '__system__'
                        );
                    END IF;

                    -- B-Tree index: RLS policy taraması için performans
                    CREATE INDEX IF NOT EXISTS "IDX_rls_tenant_customer_tenant_id"
                    ON "tenant_customer" ("tenant_id");
                END IF;
            END
            $$;
        `)

        // ═══════════════════════════════════════════════════════════
        // 4. TENANT-SALES_CHANNEL LİNK TABLOSU — RLS + İndex
        //    SalesChannel izolasyonu — en kritik link tablosu
        // ═══════════════════════════════════════════════════════════

        this.addSql(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'tenant_sales_channel' AND table_schema = 'public'
                ) THEN
                    ALTER TABLE "tenant_sales_channel" ENABLE ROW LEVEL SECURITY;

                    IF NOT EXISTS (
                        SELECT 1 FROM pg_policies
                        WHERE tablename = 'tenant_sales_channel'
                        AND policyname = 'rls_tenant_sales_channel_isolation'
                    ) THEN
                        CREATE POLICY "rls_tenant_sales_channel_isolation"
                        ON "tenant_sales_channel"
                        FOR ALL
                        USING (
                            "tenant_id" = current_setting('app.current_tenant_id', true)
                            OR current_setting('app.current_tenant_id', true) = '__system__'
                        );
                    END IF;

                    -- B-Tree index: SalesChannel çözümleme performansı
                    CREATE INDEX IF NOT EXISTS "IDX_rls_tenant_sc_tenant_id"
                    ON "tenant_sales_channel" ("tenant_id");
                END IF;
            END
            $$;
        `)

        // ═══════════════════════════════════════════════════════════
        // 5. TENANT-API_KEY LİNK TABLOSU — RLS + İndex
        // ═══════════════════════════════════════════════════════════

        this.addSql(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'tenant_api_key' AND table_schema = 'public'
                ) THEN
                    ALTER TABLE "tenant_api_key" ENABLE ROW LEVEL SECURITY;

                    IF NOT EXISTS (
                        SELECT 1 FROM pg_policies
                        WHERE tablename = 'tenant_api_key'
                        AND policyname = 'rls_tenant_api_key_isolation'
                    ) THEN
                        CREATE POLICY "rls_tenant_api_key_isolation"
                        ON "tenant_api_key"
                        FOR ALL
                        USING (
                            "tenant_id" = current_setting('app.current_tenant_id', true)
                            OR current_setting('app.current_tenant_id', true) = '__system__'
                        );
                    END IF;

                    CREATE INDEX IF NOT EXISTS "IDX_rls_tenant_ak_tenant_id"
                    ON "tenant_api_key" ("tenant_id");
                END IF;
            END
            $$;
        `)

        // ═══════════════════════════════════════════════════════════
        // 6. TENANT-STOCK_LOCATION LİNK TABLOSU — RLS + İndex
        // ═══════════════════════════════════════════════════════════

        this.addSql(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'tenant_stock_location' AND table_schema = 'public'
                ) THEN
                    ALTER TABLE "tenant_stock_location" ENABLE ROW LEVEL SECURITY;

                    IF NOT EXISTS (
                        SELECT 1 FROM pg_policies
                        WHERE tablename = 'tenant_stock_location'
                        AND policyname = 'rls_tenant_stock_location_isolation'
                    ) THEN
                        CREATE POLICY "rls_tenant_stock_location_isolation"
                        ON "tenant_stock_location"
                        FOR ALL
                        USING (
                            "tenant_id" = current_setting('app.current_tenant_id', true)
                            OR current_setting('app.current_tenant_id', true) = '__system__'
                        );
                    END IF;

                    CREATE INDEX IF NOT EXISTS "IDX_rls_tenant_sl_tenant_id"
                    ON "tenant_stock_location" ("tenant_id");
                END IF;
            END
            $$;
        `)
    }

    override async down(): Promise<void> {
        // ─── GERİ ALMA: Politikalar → Index'ler → RLS → GUC ───

        // Tenant tablosu
        this.addSql(`DROP POLICY IF EXISTS "rls_tenant_isolation" ON "tenant";`)
        this.addSql(`ALTER TABLE "tenant" DISABLE ROW LEVEL SECURITY;`)

        // Link tabloları — varsa kaldır
        this.addSql(`
            DO $$
            BEGIN
                -- tenant_customer
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_customer') THEN
                    DROP POLICY IF EXISTS "rls_tenant_customer_isolation" ON "tenant_customer";
                    DROP INDEX IF EXISTS "IDX_rls_tenant_customer_tenant_id";
                    ALTER TABLE "tenant_customer" DISABLE ROW LEVEL SECURITY;
                END IF;

                -- tenant_sales_channel
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_sales_channel') THEN
                    DROP POLICY IF EXISTS "rls_tenant_sales_channel_isolation" ON "tenant_sales_channel";
                    DROP INDEX IF EXISTS "IDX_rls_tenant_sc_tenant_id";
                    ALTER TABLE "tenant_sales_channel" DISABLE ROW LEVEL SECURITY;
                END IF;

                -- tenant_api_key
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_api_key') THEN
                    DROP POLICY IF EXISTS "rls_tenant_api_key_isolation" ON "tenant_api_key";
                    DROP INDEX IF EXISTS "IDX_rls_tenant_ak_tenant_id";
                    ALTER TABLE "tenant_api_key" DISABLE ROW LEVEL SECURITY;
                END IF;

                -- tenant_stock_location
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_stock_location') THEN
                    DROP POLICY IF EXISTS "rls_tenant_stock_location_isolation" ON "tenant_stock_location";
                    DROP INDEX IF EXISTS "IDX_rls_tenant_sl_tenant_id";
                    ALTER TABLE "tenant_stock_location" DISABLE ROW LEVEL SECURITY;
                END IF;
            END
            $$;
        `)

        // GUC varsayılan sıfırlama
        this.addSql(`
            DO $$
            BEGIN
                EXECUTE format('ALTER DATABASE %I RESET app.current_tenant_id', current_database());
            END$$;
        `)
    }
}
