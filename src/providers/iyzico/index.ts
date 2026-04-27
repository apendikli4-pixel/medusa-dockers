
import { ModuleProvider } from "@medusajs/framework/utils"
import IyzicoProvider from "./provider"

export default ModuleProvider("iyzico", {
    services: [IyzicoProvider]
})
