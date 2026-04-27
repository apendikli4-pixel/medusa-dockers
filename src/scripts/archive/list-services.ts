
import { ExecArgs } from "@medusajs/framework/types"

export default async function listServices({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    // @ts-ignore
    const registrations = Object.keys(container.registrations)
    logger.info("🧪 [DIAGNOSTIC] Listing Container Registrations...")
    logger.info(registrations.join(", "))
}
