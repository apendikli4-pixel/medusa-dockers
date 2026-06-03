import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260531143906 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "booking" ("id" text not null, "tenant_id" text not null, "product_id" text not null, "variant_id" text null, "customer_id" text null, "order_id" text null, "start_date" timestamptz not null, "end_date" timestamptz not null, "status" text not null default 'pending', "notes" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "booking_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_booking_deleted_at" ON "booking" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "booking" cascade;`);
  }

}
