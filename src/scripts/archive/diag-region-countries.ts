
import { ExecArgs } from "@medusajs/framework/types"
import * as fs from "fs"
import * as path from "path"

export default async function diagnosticRegionCountries({ container }: ExecArgs) {
    const query = container.resolve("query")
    const results: any = {
        regions: []
    }

    try {
        const { data: regions } = await query.graph({
            entity: "region",
            fields: ["id", "name", "countries.iso_2"]
        })
        results.regions = regions

        const filePath = path.join(process.cwd(), "region-countries-diagnostic.json")
        fs.writeFileSync(filePath, JSON.stringify(results, null, 2))
        console.log(`✅ Region-Countries results written to ${filePath}`)

    } catch (e: any) {
        console.error("❌ Diagnostic failed: " + e.message);
    }
}
