import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260601231707 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "page" drop constraint if exists "page_slug_unique";`);
    this.addSql(`create table if not exists "page" ("id" text not null, "title" text not null, "slug" text not null, "content" text not null, "seo_title" text null, "seo_description" text null, "status" text check ("status" in ('draft', 'published', 'archived')) not null default 'draft', "view_count" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "page_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_page_slug_unique" ON "page" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_page_status" ON "page" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_page_deleted_at" ON "page" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_post_status" ON "post" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_post_published_at" ON "post" ("published_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "page" cascade;`);

    this.addSql(`drop index if exists "IDX_post_status";`);
    this.addSql(`drop index if exists "IDX_post_published_at";`);
  }

}
