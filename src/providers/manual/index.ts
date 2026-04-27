import { ModuleProvider } from "@medusajs/framework/utils"
import ManualPaymentProvider from "./provider"

export default ModuleProvider("manual", {
    services: [ManualPaymentProvider]
})
