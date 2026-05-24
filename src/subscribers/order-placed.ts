import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { INotificationModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function orderPlacedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const notificationModuleService: INotificationModuleService = container.resolve(
        Modules.NOTIFICATION
    );

    const query: any = container.resolve("remoteQuery");

    const { data: [order] } = await query({
        entity: "order",
        fields: [
            "email",
            "display_id",
            "payment_collections.payments.payment_provider_id"
        ],
        filters: {
            id: data.id,
        },
    });

    if (!order) {
        return;
    }

    // Check if it's a manual payment (Havale/EFT)
    const isManualPayment = order.payment_collections?.some((pc: any) =>
        pc.payments?.some((p: any) => p.payment_provider_id === "manual")
    );

    const ibanInfo = isManualPayment
        ? "TR00 0000 0000 0000 0000 0000 00 (Lütfen Sipariş No belirtiniz: " + order.display_id + ")"
        : null;

    await notificationModuleService.createNotifications({
        to: order.email,
        channel: "email",
        template: process.env.BREVO_ORDER_PLACED_TEMPLATE_ID || "1",
        data: {
            order_id: order.display_id,
            is_manual: isManualPayment,
            payment_instructions: ibanInfo
        },
    });

    try {
        const { trackOrderPlacedWorkflow } = await import("../workflows/track-order-placed.js");

        // Analytics için daha fazla detaya ihtiyacımız olabilir (total, items vb.)
        // Bu yüzden sorguyu genişletiyoruz veya workflow içinde tekrar sorgu yapmasını bekliyoruz.
        // Performans açısından burada genişletmek daha mantıklı.

        const { data: [fullOrder] } = await query({
            entity: "order",
            fields: [
                "id",
                "customer_id",
                "currency_code",
                "total",
                "items.variant_id",
                "items.product_id",
                "items.quantity",
                "items.unit_price"
            ],
            filters: {
                id: data.id,
            },
        });

        if (fullOrder) {
            await trackOrderPlacedWorkflow(container).run({
                input: {
                    order: fullOrder,
                },
            });

            // ─── TENANT BAĞLAMA: Siparişi ürünün ait olduğu mağazaya bağla ───
            // İlk ürünün tenant bağlantısını bul ve siparişi aynı tenant'a ata
            try {
                const firstProductId = fullOrder.items?.[0]?.product_id
                if (firstProductId) {
                    // Ürünün bağlı olduğu tenant'ı bul
                    const { data: productLinks } = await query({
                        entity: "product",
                        fields: ["tenant.tenant_id"],
                        filters: { id: firstProductId },
                    })

                    const tenantId = productLinks?.[0]?.tenant?.tenant_id
                    if (tenantId) {
                        const { linkOrderToTenantWorkflow } = await import(
                            "../workflows/link-entity-to-tenant.js"
                        )
                        await linkOrderToTenantWorkflow(container).run({
                            input: {
                                tenant_id: tenantId,
                                order_id: data.id,
                            },
                        })
                        const logger: any = container.resolve("logger")
                        logger.info(
                            `[Order→Tenant] Sipariş ${data.id} → Tenant ${tenantId} otomatik bağlandı.`
                        )
                    }
                }
            } catch (tenantError) {
                const logger: any = container.resolve("logger")
                logger.warn(
                    `[Order→Tenant] Sipariş tenant bağlama başarısız (order: ${data.id}): ` +
                    `${tenantError instanceof Error ? tenantError.message : "Bilinmeyen"}`
                )
                // Fail-open: Tenant bağlama hatası sipariş işlemini engellemez
            }
        }
    } catch (error) {
        console.warn("Failed to trigger analytics workflow:", error);
    }
}

export const config: SubscriberConfig = {
    event: "order.placed",
};
