
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function fixAllRegionLinks({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const query = container.resolve("query")
    const remoteLink = container.resolve("remoteLink")

    logger.info("🛠️  [FIX - GLOBAL] Linking all Regions to Fulfillment and Payment...")

    try {
        // 1. Get All Regions
        const { data: regions } = await query.graph({
            entity: "region",
            fields: ["id", "name"]
        })
        
        // 2. Get Fulfillment Set
        const { data: sets } = await query.graph({
            entity: "fulfillment_set",
            fields: ["id", "name"]
        })
        const fSet = sets.find(s => s.name === "Türkiye shipping") || sets[0]

        // 3. Get All Payment Providers
        const { data: providers } = await query.graph({
            entity: "payment_provider",
            fields: ["id"]
        })

        if (!fSet) throw new Error("Fulfillment Set missing")

        for (const region of regions) {
            logger.info(`📍 Processing Region: ${region.name} (${region.id})`)

            // Link Fulfillment Set
            logger.info(`   - Linking Fulfillment Set ${fSet.id}...`)
            await remoteLink.create({
                [Modules.REGION]: { region_id: region.id },
                [Modules.FULFILLMENT]: { fulfillment_set_id: fSet.id }
            }).catch(() => logger.info(`     (already linked or error)`))

            // Link Payment Providers
            for (const provider of providers) {
                logger.info(`   - Linking Payment Provider ${provider.id}...`)
                await remoteLink.create({
                    [Modules.REGION]: { region_id: region.id },
                    [Modules.PAYMENT]: { payment_provider_id: provider.id }
                }).catch(() => {})
            }
        }

        logger.info("✨ Global Region Links repair complete!")

    } catch (e: any) {
        logger.error("❌ Global Repair failed: " + e.message)
        console.error(e)
    }
}
