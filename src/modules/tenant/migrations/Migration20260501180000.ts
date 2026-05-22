/**
 * Tenant Tablosu Migration'ı
 *
 * Bu migration, çoklu mağaza (multi-tenant) sisteminin temel tablosunu oluşturur.
 * Her satır platformdaki bağımsız bir mağazayı temsil eder.
 *
 * Medusa v2 MikroORM migration pattern'i kullanılır:
 * - Migration sınıfı extend edilir (TypeORM migration DEĞİL)
 * - this.addSql() ile raw SQL çalıştırılır
 * - Medusa'nın migration runner'ı her migration'ı transaction içinde çalıştırır,
 *   hata olursa otomatik rollback yapar — bu yüzden try-catch GEREKMEZ
 * - deleted_at kolonu Medusa soft-delete convention'ı gereği zorunludur
 *
 * Geri alınabilirlik: down() metodu tabloyu ve tüm index'leri tamamen kaldırır.
 */
import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260501180000 extends Migration {

    override async up(): Promise<void> {
        // ─── 1. TENANT TABLOSUNU OLUŞTUR ───
        // Her kolon açıklaması:
        //   id             → Benzersiz tanımlayıcı (UUID, primary key)
        //   name           → Mağaza adı (zorunlu)
        //   slug           → URL-dostu benzersiz tanımlayıcı, subdomain için kullanılır
        //   sector         → Faaliyet sektörü: retail, horeca, b2b, fashion
        //   settings       → Mağazaya özel JSON ayarları (tema, dil, para birimi vb.)
        //   features       → Aktif özellik listesi, JSON array: ["loyalty", "pos"] vb.
        //   is_active      → Mağaza aktif mi? false ise askıya alınmış
        //   owner_id       → Mağaza sahibi admin kullanıcı ID'si
        //   domain         → Opsiyonel özel alan adı (www.example.com)
        //   metadata       → Serbest formatta ek veriler
        //   created_at     → Oluşturulma zamanı (otomatik)
        //   updated_at     → Son güncelleme zamanı (otomatik)
        //   deleted_at     → Soft-delete zamanı (Medusa convention — zorunlu)
        this.addSql(`
            create table if not exists "tenant" (
                "id" text not null,
                "name" text not null,
                "slug" text not null,
                "sector" text not null default 'retail',
                "settings" jsonb null,
                "features" jsonb not null default '[]',
                "is_active" boolean not null default true,
                "owner_id" text null,
                "domain" text null,
                "metadata" jsonb null,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now(),
                "deleted_at" timestamptz null,
                constraint "tenant_pkey" primary key ("id")
            );
        `)

        // ─── 2. SLUG UNIQUE INDEX ───
        // Aynı slug'dan iki mağaza olamaz.
        // WHERE deleted_at IS NULL: Silinmiş kayıtlar unique kontrolüne dahil edilmez,
        // böylece silinen bir mağazanın slug'ı tekrar kullanılabilir.
        this.addSql(`
            CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tenant_slug_unique"
            ON "tenant" ("slug")
            WHERE deleted_at IS NULL;
        `)

        // ─── 3. SEKTÖR INDEX'İ ───
        // Sektöre göre filtreleme sorgularını hızlandırır.
        // Örn: "Tüm perakende mağazaları listele" sorgusu bu index'i kullanır.
        this.addSql(`
            CREATE INDEX IF NOT EXISTS "IDX_tenant_sector"
            ON "tenant" ("sector")
            WHERE deleted_at IS NULL;
        `)

        // ─── 4. AKTİFLİK INDEX'İ ───
        // is_active filtrelemesi neredeyse her sorguda kullanılacağından,
        // bu index performans için kritik önemdedir.
        this.addSql(`
            CREATE INDEX IF NOT EXISTS "IDX_tenant_is_active"
            ON "tenant" ("is_active")
            WHERE deleted_at IS NULL;
        `)

        // ─── 5. SAHİP (OWNER) INDEX'İ ───
        // "Bu admin kullanıcısına ait mağazaları getir" sorgusu için gerekli.
        this.addSql(`
            CREATE INDEX IF NOT EXISTS "IDX_tenant_owner_id"
            ON "tenant" ("owner_id")
            WHERE deleted_at IS NULL;
        `)

        // ─── 6. DOMAIN INDEX'İ ───
        // Özel alan adına göre tenant çözümleme için kullanılır.
        // Partial index: Sadece domain'i dolu olan kayıtlar index'e dahil edilir.
        this.addSql(`
            CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tenant_domain_unique"
            ON "tenant" ("domain")
            WHERE deleted_at IS NULL AND "domain" IS NOT NULL;
        `)

        // ─── 7. SOFT-DELETE INDEX'İ ───
        // Medusa convention: Silinmiş kayıtların hızlı filtrelenmesi için.
        this.addSql(`
            CREATE INDEX IF NOT EXISTS "IDX_tenant_deleted_at"
            ON "tenant" ("deleted_at")
            WHERE deleted_at IS NULL;
        `)
    }

    override async down(): Promise<void> {
        // ─── GERİ ALMA: Tabloyu ve tüm bağımlılıklarını kaldır ───
        // CASCADE: Bu tabloya referans veren foreign key'ler de kaldırılır.
        // Tüm index'ler tablo ile birlikte otomatik silinir.
        this.addSql(`drop table if exists "tenant" cascade;`)
    }
}
