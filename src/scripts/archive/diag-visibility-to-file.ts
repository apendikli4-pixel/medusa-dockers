
import { ExecArgs } from "@medusajs/framework/types"
import * as fs from "fs"
import * as path from "path"

export default async function diagnosticStorefrontToFile({ container }: ExecArgs) {
    const query = container.resolve("query")
    const results: any = {
        salesChannels: [],
        products: [],
        publishableKeys: []
    }

    try {
        // 1. Sales Channels
        const { data: salesChannels } = await query.graph({
            entity: "sales_channel",
            fields: ["id", "name", "description", "is_disabled"]
        })
        results.salesChannels = salesChannels

        // 2. Products
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
        results.products = products

        // 3. Publishable Keys
        const { data: apiKeys } = await query.graph({
            entity: "api_key",
            fields: ["id", "title", "type", "token", "sales_channels.id"]
        })
        results.publishableKeys = apiKeys.filter(k => k.type === "publishable")

        const filePath = path.join(process.cwd(), "visibility-diagnostic.json")
        fs.writeFileSync(filePath, JSON.stringify(results, null, 2))
        console.log(`✅ Visibility diagnostic results written to ${filePath}`)

    } catch (e: any) {
        console.error("❌ Diagnostic failed: " + e.message);
        fs.writeFileSync(path.join(process.cwd(), "visibility-error.log"), e.stack || e.message)
    }
}
