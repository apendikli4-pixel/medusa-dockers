
import { ExecArgs } from "@medusajs/framework/types"
import * as fs from "fs"
import * as path from "path"

export default async function diagnosticShippingDeep({ container }: ExecArgs) {
    const query = container.resolve("query")
    const results: any = {}

    try {
        // 1. All Shipping Options
        const { data: options } = await query.graph({
            entity: "shipping_option",
            fields: ["id", "name", "price_type", "service_zone_id", "shipping_profile_id", "provider_id"]
        })
        results.shippingOptions = options

        // 2. All Service Zones
        const { data: zones } = await query.graph({
            entity: "service_zone",
            fields: ["id", "name", "fulfillment_set_id", "geo_areas.country_code"]
        })
        results.serviceZones = zones

        // 3. All Shipping Profiles
        const { data: profiles } = await query.graph({
            entity: "shipping_profile",
            fields: ["id", "name", "type"]
        })
        results.shippingProfiles = profiles

        const filePath = path.join(process.cwd(), "shipping-deep-diagnostic.json")
        fs.writeFileSync(filePath, JSON.stringify(results, null, 2))
        console.log(`✅ Deep shipping results written to ${filePath}`)

    } catch (e: any) {
        console.error("❌ Diagnostic failed: " + e.message);
    }
}
