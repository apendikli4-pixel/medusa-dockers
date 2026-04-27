
import { ExecArgs } from "@medusajs/framework/types"

export default async function listShippingOptions({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const query = container.resolve("query")

    logger.info("🧪 [DIAGNOSTIC] Checking Shipping Options...")

    try {
        // Fetch all shipping options
        const { data: options } = await query.graph({
            entity: "shipping_option",
            fields: [
                "id",
                "name",
                "provider_id",
                "service_zone_id",
                "shipping_profile_id"
            ]
        })

        if (options.length === 0) {
            logger.info("❌ No shipping options found.")
        } else {
            logger.info(`✅ Found ${options.length} shipping options:`)
            options.forEach(opt => {
                logger.info(`- [${opt.id}] ${opt.name} (Provider: ${opt.provider_id})`)
            })
        }
    } catch (e: any) {
        logger.error("❌ Diagnostic failed: " + e.message);
    }
}
