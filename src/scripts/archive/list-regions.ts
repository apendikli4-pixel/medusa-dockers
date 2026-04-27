
import { ExecArgs } from "@medusajs/framework/types"

export default async function listRegions({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const query = container.resolve("query")

    logger.info("🧪 [DIAGNOSTIC] Listing Regions...")

    try {
        const { data: regions } = await query.graph({
            entity: "region",
            fields: ["id", "name", "currency_code"],
        })

        logger.info(`Found ${regions.length} regions:`);
        for (const region of regions) {
            logger.info(`- ${region.name} (${region.id}) [${region.currency_code}]`);
        }
    } catch (e: any) {
        logger.error("❌ Diagnostic failed: " + e.message);
    }
}
