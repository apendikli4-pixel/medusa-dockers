
import { ExecArgs } from "@medusajs/framework/types"

export default async function checkInventoryPricing({ container }: ExecArgs) {
    const query = container.resolve("query")

    console.log("------------------------------------------");
    console.log("🧪 [DIAGNOSTIC] Checking Product Infrastructure...");
    console.log("------------------------------------------");

    try {
        // 1. Regions
        const { data: regions } = await query.graph({
            entity: "region",
            fields: ["id", "name", "currency_code"],
        })
        console.log(`📍 Regions: ${regions.length} found.`);
        regions.forEach(r => console.log(`   - ${r.name} (${r.currency_code}) id: ${r.id}`));

        // 2. Currencies
        const { data: currencies } = await query.graph({
            entity: "currency",
            fields: ["code", "symbol"],
        })
        console.log(`💰 Currencies: ${currencies.length} found.`);
        // console.log(currencies.map(c => c.code).join(", "));

        // 3. Stock Locations
        const { data: locations } = await query.graph({
            entity: "stock_location",
            fields: ["id", "name"],
        })
        console.log(`🏬 Stock Locations: ${locations.length} found.`);
        locations.forEach(l => console.log(`   - ${l.name} (id: ${l.id})`));

        // 4. Products check (First 5)
        const { data: products } = await query.graph({
            entity: "product",
            fields: ["id", "title", "variants.*"],
        })
        console.log(`📦 Products: ${products.length} found.`);
        if (products.length > 0) {
            const p = products[0];
            console.log(`   Sample Product: ${p.title} (${p.id})`);
            console.log(`   Variants: ${p.variants?.length || 0}`);
        }

        console.log("------------------------------------------");
        if (regions.length === 0) console.log("⚠️  MISSING: Regions");
        if (locations.length === 0) console.log("⚠️  MISSING: Stock Locations");
        console.log("------------------------------------------");

    } catch (e: any) {
        console.log("❌ Diagnostic failed: " + e.message);
        console.error(e);
    }
}
