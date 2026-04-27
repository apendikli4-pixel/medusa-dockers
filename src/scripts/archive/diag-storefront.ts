
import { ExecArgs } from "@medusajs/framework/types"

export default async function diagnosticStorefront({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const query = container.resolve("query")

    logger.info("🧪 [DIAGNOSTIC] Checking Storefront Visibility Infrastructure...")

    try {
        // 1. Check Sales Channels
        const { data: salesChannels } = await query.graph({
            entity: "sales_channel",
            fields: ["id", "name", "description", "is_disabled"]
        })
        logger.info(`🌐 Sales Channels: ${salesChannels.length} found.`)
        salesChannels.forEach(sc => logger.info(`   - ${sc.name} (${sc.id}) [Disabled: ${sc.is_disabled}]`))

        // 2. Check Products and their Sales Channels
        const { data: products } = await query.graph({
            entity: "product",
            fields: [
                "id", 
                "title", 
                "status",
                "sales_channels.id",
                "sales_channels.name",
                "variants.id",
                "variants.title",
                "variants.inventory_items.inventory_item.id",
                "variants.inventory_items.inventory_item.sku",
                "variants.inventory_items.inventory_item.location_levels.available_quantity",
                "variants.inventory_items.inventory_item.location_levels.stock_location_id"
            ],
        })

        logger.info(`📦 Products: ${products.length} found.`)

        for (const product of products) {
            const scs = product.sales_channels || []
            logger.info(`Product: ${product.title} (${product.id}) [Status: ${product.status}]`)
            logger.info(`   Channels: ${scs.map(sc => sc.name).join(", ") || "NONE"}`)
            
            for (const variant of product.variants) {
                logger.info(`   Variant: ${variant.title}`)
                const invItems = variant.inventory_items || []
                for (const inv of invItems) {
                    const item = inv.inventory_item
                    const levels = item.location_levels || []
                    const totalAvailable = levels.reduce((sum: number, l: any) => sum + (l.available_quantity || 0), 0)
                    logger.info(`      SKU: ${item.sku}, Available: ${totalAvailable} across ${levels.length} locations.`)
                }
            }
        }

        // 3. Check Publishable API Keys (Important for storefront)
        const { data: apiKeys } = await query.graph({
            entity: "api_key",
            fields: ["id", "title", "type", "token", "sales_channels.id"]
        })
        logger.info(`🔑 API Keys: ${apiKeys.filter(k => k.type === "publishable").length} publishable found.`)
        apiKeys.filter(k => k.type === "publishable").forEach(key => {
            const linkedScs = key.sales_channels || []
            logger.info(`   - Key: ${key.title} (${key.id}) -> Channels: ${linkedScs.map((sc: any) => sc.id).join(", ") || "NONE"}`)
        })

    } catch (e: any) {
        logger.error("❌ Visibility Diagnostic failed: " + e.message);
        console.error(e);
    }
}
