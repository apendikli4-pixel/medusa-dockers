import { ModuleProvider } from "@medusajs/framework/utils"
import YurticiProviderService from "./service"

export default ModuleProvider("fulfillment", {
    services: [YurticiProviderService],
})
