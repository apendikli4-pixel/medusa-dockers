import { MedusaService } from "@medusajs/framework/utils"
import { ContactMessage } from "./models/contact-message"

class ContactModuleService extends MedusaService({
    ContactMessage
}) {
    // Özel metodlar gerekirse eklenebilir. Şimdilik MedusaService'in CRUD operasyonları yeterli.
}

export default ContactModuleService
