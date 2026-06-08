import { MedusaService } from "@medusajs/framework/utils"
import { ReturnRequest } from "./models/return-request"

class RmaModuleService extends MedusaService({
    ReturnRequest
}) {
}

export default RmaModuleService
