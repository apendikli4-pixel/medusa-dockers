import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Loyalty: customer_points (sadakat puan ledger)
 * type: earn | redeem | expire | bonus
 */
export class Migration20260527000000 extends Migration {
    override async up(): Promise<void> {
        this.addSql(`create table if not exists "customer_points" (
            "id" text not null,
            "customer_id" text not null,
            "type" text not null,
            "points" integer not null,
            "balance_after" integer not null,
            "description" text not null,
            "order_id" text null,
            "metadata" jsonb null,
            "created_at" timestamptz not null default now(),
            "updated_at" timestamptz not null default now(),
            "deleted_at" timestamptz null,
            constraint "customer_points_pkey" primary key ("id")
        );`)
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_points_customer_id" ON "customer_points" (customer_id) WHERE deleted_at IS NULL;`)
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_points_type" ON "customer_points" (type) WHERE deleted_at IS NULL;`)
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_points_created_at" ON "customer_points" (created_at DESC) WHERE deleted_at IS NULL;`)
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "customer_points" cascade;`)
    }
}
