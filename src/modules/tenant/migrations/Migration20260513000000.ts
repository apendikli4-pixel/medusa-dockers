/**
 * Tenant-Entity Link Index Migration'ı
 *
 * Bu migration, defineLink ile oluşturulan link tablolarına
 * performans index'leri ekler.
 *
 * Medusa v2'de defineLink otomatik olarak link tablolarını oluşturur:
 * - tenant_product (tenant_id ↔ product_id)
 * - tenant_order (tenant_id ↔ order_id)
 * - tenant_customer (tenant_id ↔ customer_id)
 *
 * Bu migration, bu tabloların var olduğundan emin olur ve
 * sorgulama performansı için gerekli composite index'leri ekler.
 *
 * NOT: "IF NOT EXISTS" kullanılır — migration idempotent olmalı.
 * NOT: Link tabloları Medusa tarafından yönetilir,
 *      bu migration sadece ek index'ler ekler.
 *
 * Geri alınabilirlik: down() tüm eklenen index'leri kaldırır.
 */
import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260513000000 extends Migration {

    override async up(): Promise<void> {
        // ─── 1. TENANT-PRODUCT LINK INDEX'LERİ ───
        // Mağazanın tüm ürünlerini getirmek için (sık kullanılan sorgu)
        this.addSql(`
            CREATE INDEX IF NOT EXISTS "IDX_tenant_product_link_tenant_id"
            ON "tenant_product" ("tenant_id");
        `)

        // Bir ürünün hangi mağazaya ait olduğunu bulmak için
        this.addSql(`
            CREATE INDEX IF NOT EXISTS "IDX_tenant_product_link_product_id"
            ON "tenant_product" ("product_id");
        `)

        // ─── 2. TENANT-ORDER LINK INDEX'LERİ ───
        // Mağazanın tüm siparişlerini getirmek için
        this.addSql(`
            CREATE INDEX IF NOT EXISTS "IDX_tenant_order_link_tenant_id"
            ON "tenant_order" ("tenant_id");
        `)

        // Bir siparişin hangi mağazadan verildiğini bulmak için
        this.addSql(`
            CREATE INDEX IF NOT EXISTS "IDX_tenant_order_link_order_id"
            ON "tenant_order" ("order_id");
        `)

        // ─── 3. TENANT-CUSTOMER LINK INDEX'LERİ ───
        // Mağazanın tüm müşterilerini getirmek için
        this.addSql(`
            CREATE INDEX IF NOT EXISTS "IDX_tenant_customer_link_tenant_id"
            ON "tenant_customer" ("tenant_id");
        `)

        // Bir müşterinin kayıtlı olduğu mağazaları bulmak için
        this.addSql(`
            CREATE INDEX IF NOT EXISTS "IDX_tenant_customer_link_customer_id"
            ON "tenant_customer" ("customer_id");
        `)
    }

    override async down(): Promise<void> {
        // ─── GERİ ALMA: Eklenen index'leri kaldır ───
        // Link tabloları Medusa tarafından yönetildiğinden,
        // sadece ek index'ler kaldırılır.
        this.addSql(`DROP INDEX IF EXISTS "IDX_tenant_product_link_tenant_id";`)
        this.addSql(`DROP INDEX IF EXISTS "IDX_tenant_product_link_product_id";`)
        this.addSql(`DROP INDEX IF EXISTS "IDX_tenant_order_link_tenant_id";`)
        this.addSql(`DROP INDEX IF EXISTS "IDX_tenant_order_link_order_id";`)
        this.addSql(`DROP INDEX IF EXISTS "IDX_tenant_customer_link_tenant_id";`)
        this.addSql(`DROP INDEX IF EXISTS "IDX_tenant_customer_link_customer_id";`)
    }
}
