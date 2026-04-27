import {
    createApiKeysWorkflow,
    linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"
import { ExecArgs, Logger } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function restoreStorefrontKey({
    container,
}: ExecArgs) {
    const logger = container.resolve<Logger>("logger")
    const apiKeyModuleService = container.resolve(Modules.API_KEY)
    const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)

    logger.info("🔑 [RECOVERY] Restoring Storefront API Key...")

    try {
        // 1. Get Default Sales Channel
        const [defaultSC] = await salesChannelModuleService.listSalesChannels({ name: "Default Sales Channel" })
        if (!defaultSC) {
            throw new Error("Default Sales Channel NOT FOUND. Run migrations/seed first.")
        }
        logger.info(`🌐 Using Sales Channel: ${defaultSC.name} (${defaultSC.id})`)

        // 2. Create New Publishable Key
        const { result: keyResult } = await createApiKeysWorkflow(container).run({
            input: {
                api_keys: [
                    {
                        title: "Storefront Recovery Key",
                        type: "publishable",
                        created_by: "system",
                    },
                ],
            },
        })
        const keyId = keyResult[0].id
        const token = keyResult[0].token
        logger.info(`✅ NEW TOKEN GENERATED: ${token}`)

        // 3. Link to Sales Channel
        await linkSalesChannelsToApiKeyWorkflow(container).run({
            input: {
                id: keyId,
                add: [defaultSC.id],
            },
        })
        logger.info("🔗 Token linked to Sales Channel successfully.")

        logger.info("\n=================================================")
        logger.info(`FINAL TOKEN: ${token}`)
        logger.info("=================================================\n")

    } catch (error: any) {
        logger.error("❌ Recovery failed: " + error.message)
        console.error(error)
    }
}
