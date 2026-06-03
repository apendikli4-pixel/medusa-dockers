import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260602073729 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "blog_post" drop constraint if exists "blog_post_status_check";`);

    this.addSql(`alter table if exists "blog_post" add constraint "blog_post_status_check" check("status" in ('generating', 'draft', 'published'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "blog_post" drop constraint if exists "blog_post_status_check";`);

    this.addSql(`alter table if exists "blog_post" add constraint "blog_post_status_check" check("status" in ('draft', 'published'));`);
  }

}
