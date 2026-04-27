
import { ExecArgs } from "@medusajs/framework/types"
import * as fs from "fs"
import * as path from "path"

export default async function diagnosticStockSC({ container }: ExecArgs) {
    const query = container.resolve("query")
    const results: any = {
        stockLocations: [],
        shippingOptions: []
    }

    try {
        // 1. Stock Locations and their associated Sales Channels
        const { data: locations } = await query.graph({
            entity: "stock_location",
            fields: ["id", "name", "sales_channels.id", "sales_channels.name"]
        })
        results.stockLocations = locations

        // 2. Shipping Options and their regions
        const { data: shippingOptions } = await query.graph({
            entity: "shipping_option",
            fields: ["id", "name", "region_id", "price_type"]
        })
        results.shippingOptions = shippingOptions

        const filePath = path.join(process.cwd(), "stock-sc-diagnostic.json")
        fs.writeFileSync(filePath, JSON.stringify(results, null, 2))
        console.log(`✅ Stock-SC results written to ${filePath}`)

    } catch (e: any) {
        console.error("❌ Diagnostic failed: " + e.message);
        fs.writeFileSync(path.join(process.cwd(), "stock-sc-error.log"), e.stack || e.message)
    }
}
