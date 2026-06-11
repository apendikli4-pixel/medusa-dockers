import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Blog (post) ve Sayfa (page) içeriklerini ÇOKLU MAĞAZA'ya (tenant) bağlar.
 * - tenant_id kolonu eklenir (nullable).
 * - Mevcut tüm içerik varsayılan mağazaya (slug='default' = Aqua Havuz) atanır.
 * - slug artık GLOBAL değil, TENANT BAŞINA benzersizdir (iki mağaza aynı slug'ı,
 *   örn. "hakkimizda", kullanabilsin diye). Global unique index kaldırılır,
 *   composite (tenant_id, slug) unique index eklenir.
 */
export class Migration20260611100000 extends Migration {

  override async up(): Promise<void> {
    // 1) tenant_id kolonları
    this.addSql(`alter table if exists "post" add column if not exists "tenant_id" text null;`);
    this.addSql(`alter table if exists "page" add column if not exists "tenant_id" text null;`);

    // 2) Mevcut içeriği varsayılan mağazaya backfill (Aqua Havuz)
    this.addSql(`update "post" set "tenant_id" = (select "id" from "tenant" where "slug" = 'default' limit 1) where "tenant_id" is null;`);
    this.addSql(`update "page" set "tenant_id" = (select "id" from "tenant" where "slug" = 'default' limit 1) where "tenant_id" is null;`);

    // 3) Global slug unique index'lerini kaldır
    this.addSql(`drop index if exists "IDX_post_slug_unique";`);
    this.addSql(`drop index if exists "IDX_page_slug_unique";`);
    this.addSql(`alter table if exists "post" drop constraint if exists "post_slug_unique";`);
    this.addSql(`alter table if exists "page" drop constraint if exists "page_slug_unique";`);

    // 4) Tenant başına benzersiz slug (composite unique)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_post_tenant_slug_unique" ON "post" ("tenant_id", "slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_page_tenant_slug_unique" ON "page" ("tenant_id", "slug") WHERE deleted_at IS NULL;`);

    // 5) tenant_id filtreleme indexleri
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_post_tenant_id" ON "post" ("tenant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_page_tenant_id" ON "page" ("tenant_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_post_tenant_slug_unique";`);
    this.addSql(`drop index if exists "IDX_page_tenant_slug_unique";`);
    this.addSql(`drop index if exists "IDX_post_tenant_id";`);
    this.addSql(`drop index if exists "IDX_page_tenant_id";`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_post_slug_unique" ON "post" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_page_slug_unique" ON "page" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`alter table if exists "post" drop column if exists "tenant_id";`);
    this.addSql(`alter table if exists "page" drop column if exists "tenant_id";`);
  }

}
