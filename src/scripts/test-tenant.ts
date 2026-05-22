import { MedusaContainer } from "@medusajs/framework/types"
import { createTenantWorkflow } from "../../src/workflows/create-tenant"

export default async function testTenantModule({ container }: { container: MedusaContainer }) {
    console.log("=== TENANT MODULE TEST BAŞLIYOR ===")
    
    try {
        console.log("1. createTenantWorkflow tetikleniyor...")
        
        // Mock data
        const tenantData = {
            name: "Aqua Test Mağazası " + Date.now(),
            slug: `aqua-test-${Date.now()}`,
            sector: "retail",
            settings: { locale: "tr-TR" },
            features: ["loyalty"],
        }

        const { result } = await createTenantWorkflow(container).run({
            input: tenantData
        })

        console.log("=== WORKFLOW SONUCU ===")
        console.log(`Tenant Oluşturuldu: ${result.id} - ${result.name}`)
        
        console.log("\n2. Bağlantılar kontrol ediliyor...")
        const remoteQuery = container.resolve("remoteQuery") as any
        
        const { data: tenantConnections } = await remoteQuery.graph({
            entity: "tenant",
            fields: ["id", "sales_channel.id", "stock_location.id", "api_key.token"],
            filters: { id: result.id }
        })

        const tenant = tenantConnections[0]
        console.log("Sales Channel ID: ", tenant?.sales_channel?.id || "BAĞLANAMADI")
        console.log("Stock Location ID: ", tenant?.stock_location?.id || "BAĞLANAMADI")
        console.log("Publishable API Key: ", tenant?.api_key?.token || "BAĞLANAMADI")

        if (tenant?.sales_channel?.id && tenant?.stock_location?.id && tenant?.api_key?.token) {
            console.log("\n✅ TEST BAŞARILI: Tüm native Medusa kaynakları oluşturuldu ve Tenant ile linklendi.")
        } else {
            console.log("\n❌ TEST BAŞARISIZ: Bazı kaynaklar eksik.")
        }

    } catch (e: any) {
        console.error("\n❌ HATA OLUŞTU:")
        console.error(e)
    }
}
