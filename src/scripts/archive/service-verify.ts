
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import * as fs from "fs"
import * as path from "path"

export default async function verifyShippingService({ container }: ExecArgs) {
    const fulfillmentService = container.resolve(Modules.FULFILLMENT)
    const pricingService = container.resolve(Modules.PRICING)
    
    const results: any = {}

    try {
        const options = await fulfillmentService.listShippingOptions({})
        results.options = options
        
        const sets = await fulfillmentService.listFulfillmentSets({})
        results.sets = sets

        const zones = await fulfillmentService.listServiceZones({})
        results.zones = zones

        const filePath = path.join(process.cwd(), "service-verify.json")
        fs.writeFileSync(filePath, JSON.stringify(results, null, 2))
        console.log(`✅ Service verify results written to ${filePath}`)

    } catch (e: any) {
        console.error("❌ Verify failed: " + e.message);
    }
}
