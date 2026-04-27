
import { ExecArgs } from "@medusajs/framework/types"
import * as fs from "fs"
import * as path from "path"

export default async function diagnosticFulfillment({ container }: ExecArgs) {
    const query = container.resolve("query")
    const results: any = {
        fulfillmentSets: [],
        serviceZones: [],
        fulfillmentProviders: []
    }

    try {
        // 1. Fulfillment Sets
        const { data: fSets } = await query.graph({
            entity: "fulfillment_set",
            fields: ["id", "name", "type", "service_zones.id", "service_zones.name"]
        })
        results.fulfillmentSets = fSets

        // 2. Fulfillment Providers
        const { data: providers } = await query.graph({
            entity: "fulfillment_provider",
            fields: ["id", "is_enabled"]
        })
        results.fulfillmentProviders = providers

        const filePath = path.join(process.cwd(), "fulfillment-diagnostic.json")
        fs.writeFileSync(filePath, JSON.stringify(results, null, 2))
        console.log(`✅ Fulfillment results written to ${filePath}`)

    } catch (e: any) {
        console.error("❌ Diagnostic failed: " + e.message);
        fs.writeFileSync(path.join(process.cwd(), "fulfillment-error.log"), e.stack || e.message)
    }
}
