
import { ExecArgs } from "@medusajs/framework/types"
import * as fs from "fs"
import * as path from "path"

export default async function diagnosticVisibilitySimple({ container }: ExecArgs) {
    const query = container.resolve("query")
    const results: any = {
        salesChannels: [],
        publishableKeys: [],
        products: []
    }

    try {
        // 1. Sales Channels
        const { data: scs } = await query.graph({
            entity: "sales_channel",
            fields: ["id", "name", "is_disabled"]
        })
        results.salesChannels = scs

        // 2. Publishable Keys and their channel links
        const { data: keys } = await query.graph({
            entity: "api_key",
            fields: ["id", "title", "type", "token", "sales_channels.id"],
            filters: { type: ["publishable"] }
        })
        results.publishableKeys = keys

        // 3. Just the fundamental product info to avoid join crashes
        const { data: prods } = await query.graph({
            entity: "product",
            fields: ["id", "title", "status", "sales_channels.id"]
        })
        results.products = prods

        const filePath = path.join(process.cwd(), "visibility-simple.json")
        fs.writeFileSync(filePath, JSON.stringify(results, null, 2))
        console.log(`✅ Simple visibility results written to ${filePath}`)

    } catch (e: any) {
        console.error("❌ Diagnostic failed: " + e.message);
        fs.writeFileSync(path.join(process.cwd(), "visibility-simple-error.log"), e.stack || e.message)
    }
}
