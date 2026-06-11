import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { INotificationModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { getStoreConfig } from "../modules/tenant/store-config";

export default async function orderPlacedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const notificationModuleService: INotificationModuleService = container.resolve(
        Modules.NOTIFICATION
    );
    const logger: any = container.resolve("logger");

    const query: any = container.resolve("remoteQuery");

    const { data: [order] } = await query({
        entity: "order",
        fields: [
            "email",
            "display_id",
            "items.product_id",
            "payment_collections.payments.payment_provider_id"
        ],
        filters: {
            id: data.id,
        },
    });

    if (!order) {
        return;
    }

    // ─── TENANT ÇÖZÜMLEME (bildirimden ÖNCE) ───
    // Siparişin mağazası = ilk ürünün bağlı olduğu tenant. E-posta göndericisi,
    // şablon ve IBAN bu mağazanın config'inden okunur (çoklu mağaza).
    let tenant: any = null;
    let tenantId: string | null = null;
    try {
        const firstProductId = order.items?.[0]?.product_id;
        if (firstProductId) {
            const { data: productLinks } = await query({
                entity: "product",
                fields: ["tenant.tenant_id"],
                filters: { id: firstProductId },
            });
            tenantId = productLinks?.[0]?.tenant?.tenant_id ?? null;
            if (tenantId) {
                const tenantService = container.resolve("tenant") as any;
                tenant = await tenantService.retrieveTenant(tenantId);
            }
        }
    } catch (e) {
        // Fail-open: tenant çözümlenemezse global ayarlarla devam edilir.
        logger.warn(`[order.placed] Tenant çözümlenemedi (order: ${data.id}): ${e instanceof Error ? e.message : e}`);
    }
    const storeConfig = getStoreConfig(tenant);

    // Check if it's a manual payment (Havale/EFT)
    const isManualPayment = order.payment_collections?.some((pc: any) =>
        pc.payments?.some((p: any) => p.payment_provider_id === "manual")
    );

    // IBAN yalnızca mağaza config'inde tanımlıysa gönderilir.
    // Placeholder IBAN ("TR00...") müşteriye ASLA gitmez — config boşsa talimat yok + uyarı.
    let ibanInfo: string | null = null;
    if (isManualPayment) {
        const iban = storeConfig.email?.iban?.trim();
        if (iban) {
            ibanInfo = `${iban} (Lütfen Sipariş No belirtiniz: ${order.display_id})`;
        } else {
            logger.warn(
                `[order.placed] Havale/EFT siparişi (${order.display_id}) ama mağazanın ` +
                `config'inde IBAN yok (settings.storefront.email.iban) — ödeme talimatı gönderilmedi.`
            );
        }
    }

    // Şablon: mağaza config'i → env → "1".
    const templateId =
        storeConfig.email?.templates?.orderPlaced ||
        process.env.BREVO_ORDER_PLACED_TEMPLATE_ID ||
        "1";

    await notificationModuleService.createNotifications({
        to: order.email,
        channel: "email",
        template: templateId,
        data: {
            order_id: order.display_id,
            is_manual: isManualPayment,
            payment_instructions: ibanInfo,
            store_name: tenant?.name ?? null,
            // Brevo provider per-tenant göndericiyi buradan okur (settings.storefront.email.*).
            tenant: tenant ? { settings: tenant.settings ?? {} } : null,
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
            // tenantId yukarıda (bildirim için) zaten çözümlendi — yeniden sorgulanmaz.
            try {
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
                    logger.info(
                        `[Order→Tenant] Sipariş ${data.id} → Tenant ${tenantId} otomatik bağlandı.`
                    )
                }
            } catch (tenantError) {
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
