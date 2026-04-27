import { ModuleProvider } from "@medusajs/framework/utils"
import BrevoNotificationProvider from "./provider"

export default ModuleProvider("brevo", {
    services: [BrevoNotificationProvider]
})
