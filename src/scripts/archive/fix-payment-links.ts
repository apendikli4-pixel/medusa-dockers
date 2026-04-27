
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function fixRegionPaymentLinks({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const query = container.resolve("query")
    const regionService = container.resolve(Modules.REGION)
    const remoteLink = container.resolve("remoteLink")

    logger.info("🛠️  [FIX] Linking Payment Providers to Region...")

    try {
        // 1. Get Region
        const { data: regions } = await query.graph({
            entity: "region",
            fields: ["id", "name"]
        })
        const region = regions.find(r => r.name === "Ayna Genesis") || regions[0]
        logger.info(`📍 Targeting Region: ${region.name} (${region.id})`)

        // 2. Get All Payment Providers
        const { data: providers } = await query.graph({
            entity: "payment_provider",
            fields: ["id"]
        })
        logger.info(`💳 Found ${providers.length} payment providers.`)

        // 3. Link each provider to the region
        for (const provider of providers) {
            logger.info(`   - Linking ${provider.id}...`)
            await remoteLink.create({
                [Modules.REGION]: { region_id: region.id },
                [Modules.PAYMENT]: { payment_provider_id: provider.id }
            })
            logger.info(`   - ✅ Linked.`)
        }

        logger.info("✨ Payment links repair complete!")

    } catch (e: any) {
        logger.error("❌ Repair failed: " + e.message)
        console.error(e)
    }
}
