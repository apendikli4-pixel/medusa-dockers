
import { ExecArgs } from "@medusajs/framework/types"
import { setupB2BTierWorkflow } from "../workflows/setup-b2b-tier"

export default async function ({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    logger.info("Starting B2B Tier Setup...")

    try {
        const { result } = await setupB2BTierWorkflow(container).run({})

        logger.info(`B2B Setup Completed!`)
        logger.info(`Customer Group ID: ${result.customer_group.id}`)
        logger.info(`Price List ID: ${result.price_list.id}`)
    } catch (error) {
        logger.error(`B2B Setup Failed: ${error.message}`)
    }
}
