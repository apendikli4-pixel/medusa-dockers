
import { ModuleProvider } from "@medusajs/framework/utils"
import PayTRProvider from "./provider"

export default ModuleProvider("paytr", {
    services: [PayTRProvider]
})
