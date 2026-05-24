import { MedusaContainer } from "@medusajs/framework/types"
import { createTenantWorkflow } from "../workflows/create-tenant"

/**
 * Tenant provisioning workflow smoke test.
 *
 * Çalıştırma (container içinde):
 *   docker exec -it medusa_server_core_v2 npx medusa exec src/scripts/test-tenant.ts
 *
 * Beklenen: Tenant + SalesChannel + StockLocation + APIKey + Admin User
 * atomik olarak oluşturulup link'lenir. Herhangi bir adım başarısız olursa
 * saga tüm önceki adımları geri alır.
 */
export default async function testTenantModule({ container }: { container: MedusaContainer }) {
    console.log("=== TENANT PROVISIONING TEST BAŞLIYOR ===")

    try {
        const slug = `aqua-test-${Date.now()}`
        console.log(`1. createTenantWorkflow tetikleniyor... (slug=${slug})`)

        const { result } = await createTenantWorkflow(container).run({
            input: {
                name: `Aqua Test Mağazası ${Date.now()}`,
                slug,
                sector: "retail",
                admin_email: `admin+${slug}@ayna.test`,
                admin_password: "AynaTestPass123!",
                admin_first_name: "Test",
                admin_last_name: "Admin",
                settings: { locale: "tr-TR" },
            },
        })

        console.log("=== WORKFLOW SONUCU ===")
        console.log(`Tenant ID:        ${result.tenant_id}`)
        console.log(`Sales Channel:    ${result.sales_channel_id}`)
        console.log(`Stock Location:   ${result.stock_location_id}`)
        console.log(`API Key:          ${result.api_key_id} (${result.api_key_token?.slice(0, 8)}...)`)
        console.log(`Admin User:       ${result.admin_user_id}`)

        console.log("\n2. Bağlantılar remoteQuery ile doğrulanıyor...")
        const remoteQuery = container.resolve("remoteQuery") as any

        const { data: tenantConnections } = await remoteQuery.graph({
            entity: "tenant",
            fields: ["id", "sales_channel.id", "stock_location.id", "api_key.token"],
            filters: { id: result.tenant_id },
        })

        const tenant = tenantConnections[0]
        const ok =
            tenant?.sales_channel?.id === result.sales_channel_id &&
            tenant?.stock_location?.id === result.stock_location_id &&
            tenant?.api_key?.token === result.api_key_token

        console.log(`\n${ok ? "✅" : "❌"} ${ok ? "TEST BAŞARILI" : "TEST BAŞARISIZ"}: ` +
            `Tüm native Medusa kaynakları oluşturuldu ve Tenant ile linklendi.`)
    } catch (e: any) {
        console.error("\n❌ HATA OLUŞTU:")
        console.error(e)
    }
}
