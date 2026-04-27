import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { INotificationModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function fulfillmentCreatedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const notificationModuleService: INotificationModuleService = container.resolve(
        Modules.NOTIFICATION
    );

    const query: any = container.resolve("remote_query");

    const { data: [fulfillment] } = await query({
        entity: "fulfillment",
        fields: ["provider_id", "data", "order.email", "order.display_id"],
        filters: {
            id: data.id,
        },
    });

    if (!fulfillment || !fulfillment.order) {
        return;
    }

    await notificationModuleService.createNotifications({
        to: fulfillment.order.email,
        channel: "email",
        template: "order-shipped",
        data: {
            order_id: fulfillment.order.display_id,
            tracking_number: fulfillment.data?.tracking_number || "Takip numarası bekleniyor",
            provider: fulfillment.provider_id,
        },
    });
}

export const config: SubscriberConfig = {
    event: "fulfillment.created",
};
