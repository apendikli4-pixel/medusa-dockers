
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function fixRegionFulfillmentLink({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const query = container.resolve("query")
    const remoteLink = container.resolve("remoteLink")

    logger.info("🛠️  [FIX] Linking Fulfillment Set to Region...")

    try {
        // 1. Get Region
        const { data: regions } = await query.graph({
            entity: "region",
            fields: ["id", "name"]
        })
        const region = regions.find(r => r.name === "Ayna Genesis") || regions[0]

        // 2. Get Fulfillment Set
        const { data: sets } = await query.graph({
            entity: "fulfillment_set",
            fields: ["id", "name"]
        })
        const fSet = sets.find(s => s.name === "Türkiye shipping") || sets[0]

        if (!region || !fSet) {
            throw new Error("Missing region or fulfillment set")
        }

        logger.info(`📍 Region: ${region.name} (${region.id})`)
        logger.info(`🚚 Fulfillment Set: ${fSet.name} (${fSet.id})`)

        // 3. Create Link
        await remoteLink.create({
            [Modules.REGION]: { region_id: region.id },
            [Modules.FULFILLMENT]: { fulfillment_set_id: fSet.id }
        })
        logger.info("   - ✅ Linked Fulfillment Set to Region.")

        // 4. Double check Payment links while we're here
        const { data: paymentProviders } = await query.graph({
            entity: "payment_provider",
            fields: ["id"]
        })
        for (const provider of paymentProviders) {
            await remoteLink.create({
                [Modules.REGION]: { region_id: region.id },
                [Modules.PAYMENT]: { payment_provider_id: provider.id }
            }).catch(() => {}) // Ignore if already exists
        }
        logger.info("   - ✅ Payment links verified.")

    } catch (e: any) {
        logger.error("❌ Link Repair failed: " + e.message)
        console.error(e)
    }
}
