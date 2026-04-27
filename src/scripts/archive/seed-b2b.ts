
import { ExecArgs } from "@medusajs/framework/types"
import { seedB2BPricesWorkflow } from "../workflows/seed-b2b-prices"

export default async function ({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    logger.info("Starting B2B B2B Price Seeding...")

    try {
        const { result } = await seedB2BPricesWorkflow(container).run({})

        logger.info(`B2B Seeding Completed!`)
        logger.info(`Added ${result.count} wholesale prices.`)
    } catch (error) {
        logger.error(`B2B Seeding Failed: ${error.message}`)
        console.error(error)
    }
}
