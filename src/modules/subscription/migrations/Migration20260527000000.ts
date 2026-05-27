import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Subscription: müşteri abonelikleri (auto-renewal)
 * status: active | paused | cancelled
 */
export class Migration20260527000000 extends Migration {
    override async up(): Promise<void> {
        this.addSql(`create table if not exists "subscription" (
            "id" text not null,
            "customer_id" text not null,
            "product_id" text not null,
            "variant_id" text not null,
            "frequency_days" integer not null default 30,
            "next_renewal_at" timestamptz not null,
            "status" text not null default 'active',
            "last_order_id" text null,
            "shipping_address_id" text null,
            "discount_percentage" integer not null default 10,
            "created_at" timestamptz not null default now(),
            "updated_at" timestamptz not null default now(),
            "deleted_at" timestamptz null,
            constraint "subscription_pkey" primary key ("id")
        );`)
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_subscription_customer_id" ON "subscription" (customer_id) WHERE deleted_at IS NULL;`)
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_subscription_status" ON "subscription" (status) WHERE deleted_at IS NULL;`)
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_subscription_next_renewal" ON "subscription" (next_renewal_at) WHERE deleted_at IS NULL AND status = 'active';`)
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "subscription" cascade;`)
    }
}
