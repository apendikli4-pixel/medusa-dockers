import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260324035258 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "memory_truth" add column if not exists "is_archived" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "memory_truth" drop column if exists "is_archived";`);
  }

}
