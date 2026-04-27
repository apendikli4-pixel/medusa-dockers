import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function createPubKey({ container }: ExecArgs) {
  const apiKeyModule = container.resolve(Modules.API_KEY)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const remoteLink = container.resolve("remoteLink")
  
  try {
    // 1. Check if key already exists to avoid duplicates
    const [existingKeys] = await apiKeyModule.listAndCountApiKeys({ type: "publishable" })
    let targetKey = existingKeys[0]

    if (!targetKey) {
        // Create Publishable API Key
        targetKey = await apiKeyModule.createApiKeys({
            title: "Storefront Key Generate",
            type: "publishable",
            created_by: "system"
        })
    }

    // 2. Get sales channel
    const [salesChannels] = await salesChannelModule.listAndCountSalesChannels()
    const defaultChannel = salesChannels[0]
    
    if (defaultChannel) {
        // Gelişmeye açık: Sistem ayarlarından veya başka bir TS script ile linklenebilir
        // Lütfen Admin UI'den "Default Sales Channel"a bağlayın.
        console.log("===SUCCESS_PUB_KEY===" + targetKey.token)
    } else {
        console.log("===NO_SALES_CHANNEL===")
    }
  } catch (error: any) {
    console.error("===ERROR===" + error.message)
  }
}
