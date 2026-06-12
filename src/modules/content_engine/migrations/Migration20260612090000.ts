import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * DÜZELTME: Migration20260611100000'deki backfill `slug='default'` arıyordu,
 * fakat varsayılan mağazanın (Aqua Havuz) gerçek slug'ı 'aqua-havuz'.
 * Subquery NULL döndü → mevcut tüm blog yazıları ve sayfalar tenant_id=NULL
 * kaldı → hiçbir vitrinde görünmediler.
 *
 * Bu migration NULL kalan içeriği varsayılan mağazaya atar:
 *   1) slug='aqua-havuz' olan tenant (bu kurulumun gerçeği)
 *   2) yoksa slug='default' (eski varsayım — başka ortamlar için)
 *   3) yoksa en eski tenant (ilk kurulan mağaza = varsayılan mağaza)
 * tenant_id'si DOLU içeriklere (admin'den mağaza seçilerek oluşturulanlar) dokunmaz.
 */
export class Migration20260612090000 extends Migration {

  override async up(): Promise<void> {
    const defaultTenant = `coalesce(
      (select "id" from "tenant" where "slug" = 'aqua-havuz' limit 1),
      (select "id" from "tenant" where "slug" = 'default' limit 1),
      (select "id" from "tenant" order by "created_at" asc limit 1)
    )`;

    this.addSql(`update "post" set "tenant_id" = ${defaultTenant} where "tenant_id" is null;`);
    this.addSql(`update "page" set "tenant_id" = ${defaultTenant} where "tenant_id" is null;`);
  }

  override async down(): Promise<void> {
    // Veri düzeltmesi — geri alınmaz (NULL'a döndürmek içeriği yine görünmez yapardı).
  }

}
