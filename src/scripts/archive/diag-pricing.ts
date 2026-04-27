
import { ExecArgs } from "@medusajs/framework/types"

export default async function diagPricing({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const query = container.resolve("query")

    logger.info("🧪 [DIAGNOSTIC] Checking Pricing Structure...")

    try {
        // 1. Get products and their variants with pricing details
        const { data: products } = await query.graph({
            entity: "product",
            fields: [
                "id", 
                "title", 
                "variants.id", 
                "variants.title", 
                "variants.sku",
                "variants.price_set.id",
                "variants.price_set.prices.id",
                "variants.price_set.prices.amount",
                "variants.price_set.prices.currency_code",
                "variants.price_set.prices.rules_count"
            ],
        })

        logger.info(`📦 Checking ${products.length} products...`)

        for (const product of products) {
            logger.info(`Product: ${product.title} (${product.id})`)
            for (const variant of product.variants) {
                logger.info(`  Variant: ${variant.title} (SKU: ${variant.sku})`)
                const priceSet = variant.price_set;
                if (!priceSet) {
                    logger.warn(`    ⚠️  MISSING: Price Set for variant ${variant.id}`)
                } else {
                    logger.info(`    Price Set ID: ${priceSet.id}`)
                    const prices = priceSet.prices || []
                    logger.info(`    Prices: ${prices.length} entries found.`)
                    prices.forEach(p => {
                        logger.info(`      - Price ID: ${p.id}, Amount: ${p.amount}, Currency: ${p.currency_code}`)
                    })
                }
            }
        }

        // 2. Check Price Rules / Regions
        const { data: regions } = await query.graph({
            entity: "region",
            fields: ["id", "name", "currency_code"]
        })
        logger.info(`📍 Regions: ${regions.length} found.`)
        regions.forEach(r => logger.info(`   - ${r.name} (${r.currency_code}) id: ${r.id}`))

    } catch (e: any) {
        logger.error("❌ Pricing Diagnostic failed: " + e.message);
        console.error(e);
    }
}
