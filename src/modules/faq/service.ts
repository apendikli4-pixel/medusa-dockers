import { MedusaService } from "@medusajs/framework/utils"
import { FaqItem } from "./models/faq-item"

class FaqModuleService extends MedusaService({
    FaqItem
}) {
}

export default FaqModuleService
