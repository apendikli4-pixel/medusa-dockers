
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function fixShippingFinal({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const query = container.resolve("query")
    const fulfillmentService = container.resolve(Modules.FULFILLMENT)
    
    logger.info("🛠️  [FIX - FINAL] Starting Final Shipping Repair...")

    try {
        // 1. Get Service Zone
        const zones = await fulfillmentService.listServiceZones({ name: ["Türkiye Zone"] })
        if (zones.length === 0) {
            logger.error("❌ Service Zone missing. Run previous fix first.")
            return
        }
        const zone = zones[0]
        logger.info(`📍 Zone: ${zone.name} (${zone.id})`)

        // 2. Link Provider to Service Zone
        // In v2, this is done via createServiceZones or updateServiceZones geo_areas? 
        // No, it's usually via fulfillment_set_fulfillment_provider or similar links.
        // Let's check the service methods.
        
        // Actually, let's use the core workflow as it handles all these links.
        const { 
          createShippingOptionsWorkflow 
        } = require("@medusajs/medusa/core-flows")

        // Get profiles
        const { data: profiles } = await query.graph({
            entity: "shipping_profile",
            fields: ["id"]
        })
        const profileId = profiles[0].id

        logger.info(`🚚 Profile: ${profileId}`)

        const { result } = await createShippingOptionsWorkflow(container).run({
            input: [
                {
                    name: "Standart Kargo",
                    service_zone_id: zone.id,
                    shipping_profile_id: profileId,
                    provider_id: "manual_manual-fulfillment",
                    price_type: "flat_rate",
                    type: {
                        label: "Standart",
                        description: "Standart teslimat",
                        code: "standard"
                    },
                    prices: [
                        {
                            currency_code: "try",
                            amount: 5000 // 50.00 TL
                        }
                    ],
                    rules: []
                }
            ]
        })

        logger.info(`   - ✅ Created Shipping Option: ${result[0].id}`)
        logger.info("✨ Final Shipping Repair complete!")

    } catch (e: any) {
        logger.error("❌ Repair failed: " + e.message)
        console.error(e)
    }
}
