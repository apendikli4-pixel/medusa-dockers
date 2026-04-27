
import { ExecArgs } from "@medusajs/framework/types"
import * as fs from "fs"
import * as path from "path"

export default async function diagnosticVariants({ container }: ExecArgs) {
    const query = container.resolve("query")
    const results: any = {
        products_with_variants: []
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
                "variants.manage_inventory",
                "variants.inventory_items.inventory_item_id"
            ],
        })

        results.products_with_variants = products.filter(p => p.variants && p.variants.length > 0)

        const filePath = path.join(process.cwd(), "variant-diagnostic.json")
        fs.writeFileSync(filePath, JSON.stringify(results, null, 2))
        console.log(`✅ Results written to ${filePath}`)

    } catch (e: any) {
        console.error("❌ Diagnostic failed: " + e.message);
        fs.writeFileSync(path.join(process.cwd(), "variant-error.log"), e.stack || e.message)
    }
}
