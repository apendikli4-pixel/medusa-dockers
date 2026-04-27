
import { ExecArgs } from "@medusajs/framework/types"
import * as fs from "fs"
import * as path from "path"

export default async function diagnosticFinalVisibility({ container }: ExecArgs) {
    const query = container.resolve("query")
    const results: any = {}

    try {
        // 1. Shipping Options
        const { data: options } = await query.graph({
            entity: "shipping_option",
            fields: ["id", "name"]
        })
        results.options = options

        // 2. Shipping Profiles
        const { data: profiles } = await query.graph({
            entity: "shipping_profile",
            fields: ["id", "name"]
        })
        results.profiles = profiles

        // 3. Products and their Shipping Profiles
        const { data: products } = await query.graph({
            entity: "product",
            fields: ["id", "title", "shipping_profile.id", "shipping_profile.name"]
        })
        results.productsWithProfile = products

        const filePath = path.join(process.cwd(), "final-visibility.json")
        fs.writeFileSync(filePath, JSON.stringify(results, null, 2))
        console.log(`✅ Final visibility results written to ${filePath}`)

    } catch (e: any) {
        console.error("❌ Diagnostic failed: " + e.message);
        fs.writeFileSync(path.join(process.cwd(), "final-visibility-error.log"), e.stack || e.message)
    }
}
