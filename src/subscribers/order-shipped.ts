import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { INotificationModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { getStoreConfig } from "../modules/tenant/store-config";

export default async function fulfillmentCreatedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const notificationModuleService: INotificationModuleService = container.resolve(
        Modules.NOTIFICATION
    );
    const logger: any = container.resolve("logger");

    const query: any = container.resolve("remote_query");

    const { data: [fulfillment] } = await query({
        entity: "fulfillment",
        fields: ["provider_id", "data", "order.email", "order.display_id", "order.items.product_id"],
        filters: {
            id: data.id,
        },
    });

    if (!fulfillment || !fulfillment.order) {
        return;
    }

    // ─── TENANT ÇÖZÜMLEME — gönderici + şablon mağazanın config'inden (çoklu mağaza) ───
    let tenant: any = null;
    try {
        const firstProductId = fulfillment.order.items?.[0]?.product_id;
        if (firstProductId) {
            const { data: productLinks } = await query({
                entity: "product",
                fields: ["tenant.tenant_id"],
                filters: { id: firstProductId },
            });
            const tenantId = productLinks?.[0]?.tenant?.tenant_id;
            if (tenantId) {
                const tenantService = container.resolve("tenant") as any;
                tenant = await tenantService.retrieveTenant(tenantId);
            }
        }
    } catch (e) {
        logger.warn(`[fulfillment.created] Tenant çözümlenemedi: ${e instanceof Error ? e.message : e}`);
    }
    const storeConfig = getStoreConfig(tenant);

    // Şablon: mağaza config'i → env → eski değer.
    // NOT: Brevo sayısal şablon ID ister; config/env tanımlı değilse eski
    // "order-shipped" değeri provider'da reddedilir (mail gitmez) — uyarı logla.
    const templateId =
        storeConfig.email?.templates?.orderShipped ||
        process.env.BREVO_ORDER_SHIPPED_TEMPLATE_ID ||
        "order-shipped";
    if (templateId === "order-shipped") {
        logger.warn(
            "[fulfillment.created] Kargo e-postası için sayısal Brevo şablon ID'si tanımlı değil " +
            "(settings.storefront.email.templates.orderShipped veya BREVO_ORDER_SHIPPED_TEMPLATE_ID) — e-posta gönderilmeyecek."
        );
    }

    await notificationModuleService.createNotifications({
        to: fulfillment.order.email,
        channel: "email",
        template: templateId,
        data: {
            order_id: fulfillment.order.display_id,
            tracking_number: fulfillment.data?.tracking_number || "Takip numarası bekleniyor",
            provider: fulfillment.provider_id,
            store_name: tenant?.name ?? null,
            // Brevo provider per-tenant göndericiyi buradan okur.
            tenant: tenant ? { settings: tenant.settings ?? {} } : null,
        },
    });
}

export const config: SubscriberConfig = {
    event: "fulfillment.created",
};
