import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260601231555 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "blog_post" drop constraint if exists "blog_post_slug_unique";`);
    this.addSql(`create table if not exists "blog_post" ("id" text not null, "slug" text not null, "title" text not null, "excerpt" text null, "content" text not null, "seo_title" text null, "seo_description" text null, "keywords" jsonb null, "thumbnail" text null, "status" text check ("status" in ('draft', 'published')) not null default 'draft', "tenant_id" text null, "ai_generated" boolean not null default false, "published_at" timestamptz null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "blog_post_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_blog_post_slug_unique" ON "blog_post" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_blog_post_deleted_at" ON "blog_post" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "blog_post" cascade;`);
  }

}
