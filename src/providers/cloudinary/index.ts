import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { CloudinaryFileProviderService } from "./provider"

const services = [CloudinaryFileProviderService]

export default ModuleProvider(Modules.FILE, {
    services,
})
