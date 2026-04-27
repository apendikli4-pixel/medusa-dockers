import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260314221345 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "conscience_settings" drop constraint if exists "conscience_settings_customer_id_unique";`);
    this.addSql(`create table if not exists "conscience_log" ("id" text not null, "customer_id" text not null, "level" text not null, "message" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "conscience_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_conscience_log_customer_id" ON "conscience_log" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_conscience_log_deleted_at" ON "conscience_log" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "conscience_settings" ("id" text not null, "customer_id" text not null, "monthly_limit" integer not null default 0, "current_spending" integer not null default 0, "is_active" boolean not null default true, "preferences" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "conscience_settings_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_conscience_settings_customer_id_unique" ON "conscience_settings" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_conscience_settings_deleted_at" ON "conscience_settings" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "conscience_log" cascade;`);

    this.addSql(`drop table if exists "conscience_settings" cascade;`);
  }

}
