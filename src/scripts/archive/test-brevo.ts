import { MedusaContainer } from "@medusajs/framework/types"

export default async function brevoTest(container: MedusaContainer) {
    const logger = container.resolve("logger")
    try {
        const notificationModuleService = container.resolve("notification")
        logger.info("Sending test email via Notification Module...")

        const result = await notificationModuleService.createNotifications({
            to: "test@example.com",
            channel: "email",
            template: "test-template",
            data: { test: true },
        })

        logger.info("Test notification result: " + JSON.stringify(result, null, 2))
    } catch (e) {
        logger.error("Error during test notification: " + e.message)
    }
}
