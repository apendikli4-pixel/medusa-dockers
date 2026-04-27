
import { ExecArgs } from "@medusajs/framework/types"

export default async function verifyCheckout({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const query = container.resolve("query")

    logger.info("🧪 [VERIFY] Checking Checkout Availability...")

    const regionId = "reg_01KKJN7R89BYZ0EZKRD1R857F1"

    try {
        // 1. Check Shipping Options for this region
        // We use query.graph to find options linked to fulfillment sets linked to this region
        const { data: regionDetails } = await query.graph({
            entity: "region",
            fields: [
                "id", 
                "name", 
                "fulfillment_sets.id", 
                "fulfillment_sets.name",
                "fulfillment_sets.service_zones.shipping_options.id",
                "fulfillment_sets.service_zones.shipping_options.name",
                "payment_providers.id"
            ],
            filters: { id: [regionId] }
        })

        logger.info(`Region: ${regionDetails[0].name}`)
        
        const fSets = regionDetails[0].fulfillment_sets || []
        logger.info(`Fulfillment Sets: ${fSets.length}`)
        for (const set of fSets) {
            logger.info(`  - Set: ${set.name} (${set.id})`)
            const zones = set.service_zones || []
            for (const zone of zones) {
                const options = zone.shipping_options || []
                logger.info(`    - Zone: ${zone.name}, Options: ${options.map((o: any) => o.name).join(", ") || "NONE"}`)
            }
        }

        const pProviders = regionDetails[0].payment_providers || []
        logger.info(`Payment Providers: ${pProviders.map((p: any) => p.id).join(", ") || "NONE"}`)

        if (fSets.length > 0 && pProviders.length > 0) {
            logger.info("✅ SUCCESS: Both Shipping and Payment are configured for this region.")
        } else {
            logger.warn("⚠️ STILL MISSING: " + (fSets.length === 0 ? "Fulfillment Sets " : "") + (pProviders.length === 0 ? "Payment Providers" : ""))
        }

    } catch (e: any) {
        logger.error("❌ Verification failed: " + e.message)
        console.error(e)
    }
}
