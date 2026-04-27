import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260314222131 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "memory_conscience" ("id" text not null, "entity_id" text not null, "action_type" text not null, "impact" text not null, "timestamp" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "memory_conscience_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_memory_conscience_entity_id" ON "memory_conscience" ("entity_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_memory_conscience_deleted_at" ON "memory_conscience" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "memory_insight" ("id" text not null, "entity_id" text not null, "content" text not null, "is_archived" boolean not null default false, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "memory_insight_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_memory_insight_entity_id" ON "memory_insight" ("entity_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_memory_insight_deleted_at" ON "memory_insight" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "memory_truth" ("id" text not null, "entity_id" text not null, "content" text not null, "importance" integer not null default 1, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "memory_truth_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_memory_truth_entity_id" ON "memory_truth" ("entity_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_memory_truth_deleted_at" ON "memory_truth" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "mission" ("id" text not null, "title" text not null, "description" text null, "status" text check ("status" in ('pending', 'in_progress', 'completed', 'failed')) not null default 'pending', "priority" text check ("priority" in ('low', 'medium', 'high', 'critical')) not null default 'medium', "assigned_to" text null, "created_by" text not null default 'ayna', "result" jsonb null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mission_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mission_deleted_at" ON "mission" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "memory_conscience" cascade;`);

    this.addSql(`drop table if exists "memory_insight" cascade;`);

    this.addSql(`drop table if exists "memory_truth" cascade;`);

    this.addSql(`drop table if exists "mission" cascade;`);
  }

}
