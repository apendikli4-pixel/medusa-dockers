
import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { INotificationModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function shipmentCreatedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const notificationModuleService: INotificationModuleService = container.resolve(
        Modules.NOTIFICATION
    );

    const query: any = container.resolve("remoteQuery");

    // Fetch shipment details including tracking numbers and parent order email
    const { data: [shipment] } = await query({
        entity: "shipment",
        fields: [
            "id",
            "tracking_number",
            "fulfillment.order.email",
            "fulfillment.order.display_id"
        ],
        filters: {
            id: data.id,
        },
    });

    if (!shipment || !shipment.fulfillment?.order?.email) {
        return;
    }

    await notificationModuleService.createNotifications({
        to: shipment.fulfillment.order.email,
        channel: "email",
        template: "shipment-created",
        data: {
            order_id: shipment.fulfillment.order.display_id,
            tracking_number: shipment.tracking_number,
        },
    });
}

export const config: SubscriberConfig = {
    event: "shipment.created",
};
