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
        // Link tabloları (tenant_product, tenant_order, tenant_customer) Medusa
        // tarafından `medusa db:sync-links` ile oluşturulur — bu migration
        // db:migrate adımında çalıştığı için tablolar henüz yok olabilir.
        // Bu yüzden her index'i `DO $$` bloğu içinde tablo varlığına göre koruyoruz.
        const indexes: Array<{ idx: string; table: string; col: string }> = [
            { idx: "IDX_tenant_product_link_tenant_id", table: "tenant_product", col: "tenant_id" },
            { idx: "IDX_tenant_product_link_product_id", table: "tenant_product", col: "product_id" },
            { idx: "IDX_tenant_order_link_tenant_id", table: "tenant_order", col: "tenant_id" },
            { idx: "IDX_tenant_order_link_order_id", table: "tenant_order", col: "order_id" },
            { idx: "IDX_tenant_customer_link_tenant_id", table: "tenant_customer", col: "tenant_id" },
            { idx: "IDX_tenant_customer_link_customer_id", table: "tenant_customer", col: "customer_id" },
        ]

        for (const { idx, table, col } of indexes) {
            this.addSql(`
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${table}') THEN
                        EXECUTE 'CREATE INDEX IF NOT EXISTS "${idx}" ON "${table}" ("${col}")';
                    END IF;
                END$$;
            `)
        }
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
