
import { createWorkflow } from "@medusajs/framework/workflows-sdk";
import { createStep } from "@medusajs/framework/workflows-sdk";
import { Modules } from "@medusajs/framework/utils";
import { OrderDTO } from "@medusajs/framework/types";

type StepInput = {
    order: OrderDTO
}

const trackOrderPlacedStep = createStep(
    "track-order-placed-step",
    async ({ order }: StepInput, { container }) => {
        try {
            const analyticsModuleService = container.resolve("analytics") as any
            await analyticsModuleService.track({
                event: "order_placed",
                actor_id: order.customer_id,
                properties: {
                    order_id: order.id,
                    total: order.total,
                    items: order.items?.map((item) => ({
                        variant_id: item.variant_id,
                        product_id: item.product_id,
                        quantity: item.quantity,
                    })),
                    customer_id: order.customer_id,
                },
            });
        } catch (error) {
            const logger = container.resolve("logger") as any
            logger.warn("Analytics module not found or failed to track event:", error)
        }
    },
    async (orderId, { container }) => {
        // Compensation: Log the failure of tracking for manual audit if necessary
        const logger = container.resolve("logger") as any
        logger.warn(`Order placement tracking failed/compensated for order: ${orderId}`)
    }
);

type WorkflowInput = {
    order_id: string;
};

export const trackOrderPlacedWorkflow = createWorkflow(
    "track-order-placed-workflow",
    ({ order }: { order: OrderDTO }) => {
        trackOrderPlacedStep({ order });
    }
);
