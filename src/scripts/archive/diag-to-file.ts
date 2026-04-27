
import { ExecArgs } from "@medusajs/framework/types"
import * as fs from "fs"
import * as path from "path"

export default async function diagnosticToFile({ container }: ExecArgs) {
    const query = container.resolve("query")
    const results: any = {
        timestamp: new Date().toISOString(),
        regions: [],
        currencies: [],
        locations: [],
        products_sample: []
    }

    try {
        // 1. Regions
        const { data: regions } = await query.graph({
            entity: "region",
            fields: ["id", "name", "currency_code"],
        })
        results.regions = regions

        // 2. Currencies
        const { data: currencies } = await query.graph({
            entity: "currency",
            fields: ["code", "symbol"],
        })
        results.currencies = currencies

        // 3. Stock Locations
        const { data: locations } = await query.graph({
            entity: "stock_location",
            fields: ["id", "name"],
        })
        results.locations = locations

        // 4. Products check (First 2)
        const { data: products } = await query.graph({
            entity: "product",
            fields: ["id", "title", "variants.id", "variants.title"],
        })
        results.products_sample = products.slice(0, 2)

        const filePath = path.join(process.cwd(), "infra-diagnostic.json")
        fs.writeFileSync(filePath, JSON.stringify(results, null, 2))
        console.log(`✅ Diagnostic results written to ${filePath}`)

    } catch (e: any) {
        console.error("❌ Diagnostic failed: " + e.message);
        fs.writeFileSync(path.join(process.cwd(), "infra-error.log"), e.stack || e.message)
    }
}
