
import { ExecArgs } from "@medusajs/framework/types"
import { 
  createShippingOptionsWorkflow 
} from "@medusajs/medusa/core-flows"

export default async function fixShippingActuallyFinal({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const query = container.resolve("query")
    
    logger.info("🛠️  [FIX - ACTUALLY FINAL] Starting Corrected Shipping Repair...")

    try {
        const { data: profiles } = await query.graph({ entity: "shipping_profile", fields: ["id"] })
        const { data: zones } = await query.graph({ entity: "service_zone", fields: ["id"] })

        if (profiles.length === 0 || zones.length === 0) {
            throw new Error("Missing essential data")
        }

        const profileId = profiles[0].id
        const zoneId = zones[0].id
        const providerId = "manual_manual-fulfillment"

        const { result } = await createShippingOptionsWorkflow(container).run({
            input: [
                {
                    name: "Standart Kargo",
                    service_zone_id: zoneId,
                    shipping_profile_id: profileId,
                    provider_id: providerId,
                    price_type: "flat", // FIXED: "flat" instead of "flat_rate"
                    type: {
                        label: "Standart",
                        description: "Teslimat",
                        code: "standard"
                    },
                    prices: [
                        {
                            currency_code: "try",
                            amount: 5000
                        }
                    ],
                    rules: []
                }
            ]
        })

        logger.info(`   - ✅ Successfully created Shipping Option: ${result[0].id}`)
        logger.info("✨ Storefront visibility repair complete!")

    } catch (e: any) {
        logger.error("❌ Repair failed: " + e.message)
        console.error(e)
    }
}
