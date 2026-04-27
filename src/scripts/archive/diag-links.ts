
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import * as fs from "fs"
import * as path from "path"

export default async function diagnosticLinks({ container }: ExecArgs) {
    const remoteLink = container.resolve("remoteLink")
    const query = container.resolve("query")
    const results: any = {}

    try {
        // 1. Get Region and Fulfillment Set IDs
        const { data: regions } = await query.graph({ entity: "region", fields: ["id", "name"] })
        const { data: sets } = await query.graph({ entity: "fulfillment_set", fields: ["id", "name"] })
        
        results.regions = regions
        results.fulfillmentSets = sets

        // 2. Check for links between REGIN and FULFILLMENT
        // This is usually Region <-> FulfillmentSet
        const links = await remoteLink.list({
            [Modules.REGION]: { region_id: regions.map(r => r.id) }
        })
        results.links = links

        const filePath = path.join(process.cwd(), "link-diagnostic.json")
        fs.writeFileSync(filePath, JSON.stringify(results, null, 2))
        console.log(`✅ Link results written to ${filePath}`)

    } catch (e: any) {
        console.error("❌ Link Diagnostic failed: " + e.message);
    }
}
