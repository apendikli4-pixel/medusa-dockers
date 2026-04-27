
import { ExecArgs } from "@medusajs/framework/types"

export default async function checkInventoryPricing({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const query = container.resolve("query")

    logger.info("🧪 [DIAGNOSTIC] Checking Product Infrastructure...")

    try {
        // 1. Regions & Currencies
        const { data: regions } = await query.graph({
            entity: "region",
            fields: ["id", "name", "currency_code"],
        })
        logger.info(`📍 Regions: ${regions.length} found.`)
        regions.forEach(r => logger.info(`   - ${r.name} (${r.currency_code})`))

        // 2. Currencies
        const { data: currencies } = await query.graph({
            entity: "currency",
            fields: ["code", "symbol"],
        })
        logger.info(`💰 Currencies: ${currencies.length} found.`)
        currencies.forEach(c => logger.info(`   - ${c.code} (${c.symbol})`))

        // 3. Stock Locations
        const { data: locations } = await query.graph({
            entity: "stock_location",
            fields: ["id", "name"],
        })
        logger.info(`🏬 Stock Locations: ${locations.length} found.`)
        locations.forEach(l => logger.info(`   - ${l.name} (${l.id})`))

        // 4. Inventory Items
        const { data: inventoryItems } = await query.graph({
            entity: "inventory_item",
            fields: ["id", "sku"],
        })
        logger.info(`📦 Inventory Items: ${inventoryItems.length} found.`)

        if (regions.length === 0) {
            logger.warn("⚠️  WARNING: No regions found. You cannot set prices without at least one region.")
        }
        if (locations.length === 0) {
            logger.warn("⚠️  WARNING: No stock locations found. You cannot add stock levels without a stock location.")
        }

    } catch (e: any) {
        logger.error("❌ Diagnostic failed: " + e.message);
        console.error(e);
    }
}
