
import { ExecArgs } from "@medusajs/framework/types"
import * as fs from "fs"
import * as path from "path"

export default async function diagPricingToFile({ container }: ExecArgs) {
    const query = container.resolve("query")
    const results: any = {
        products: []
    }

    try {
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
            ],
        })

        results.products = products

        const filePath = path.join(process.cwd(), "pricing-diagnostic.json")
        fs.writeFileSync(filePath, JSON.stringify(results, null, 2))
        console.log(`✅ Pricing diagnostic results written to ${filePath}`)

    } catch (e: any) {
        console.error("❌ Diagnostic failed: " + e.message);
        fs.writeFileSync(path.join(process.cwd(), "pricing-error.log"), e.stack || e.message)
    }
}
