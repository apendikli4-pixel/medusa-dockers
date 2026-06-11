
import { AbstractNotificationProviderService } from "@medusajs/framework/utils"
class BrevoNotificationProvider extends AbstractNotificationProviderService {
    static identifier = "brevo"
    protected options: Record<string, any>
    protected logger: any

    constructor(container: any, options: Record<string, any>) {
        super()
        this.options = options
        this.logger = container.logger
    }

    async send(notification: any) {
        if (!this.options.api_key) {
            this.logger?.warn("[Brevo] No API key provided, skipping email send.");
            return {}
        }

        const templateId = parseInt(notification.template, 10)

        // If template can't be parsed, fallback to text content if provided or abort
        if (isNaN(templateId)) {
            this.logger?.error(`[Brevo] Invalid template ID provided: ${notification.template}. Must be a Brevo numeric ID.`);
            return {}
        }

        // Mağaza (Tenant) düzeyinde özel gönderici bilgisi varsa onu kullan, yoksa globale dön.
        // Öncelik: StoreConfig (settings.storefront.email.*) → eski düz alanlar → global env.
        const tenantSettings = notification.data?.tenant?.settings
        const emailCfg = tenantSettings?.storefront?.email
        const senderName = emailCfg?.senderName || tenantSettings?.email_sender_name || this.options.from_name || "System"
        const senderEmail = emailCfg?.senderAddress || tenantSettings?.email_sender_address || this.options.from_email || "donotreply@example.com"

        const payload = {
            sender: {
                name: senderName,
                email: senderEmail
            },
            to: [{ email: notification.to }],
            templateId: templateId,
            params: notification.data || {}
        }

        try {
            const response = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                    "accept": "application/json",
                    "content-type": "application/json",
                    "api-key": this.options.api_key as string
                },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const errorData = await response.json()
                this.logger?.error(`[Brevo] Failed to send email: ${JSON.stringify(errorData)}`)
                return {}
            }

            const data = await response.json()
            this.logger?.info(`[Brevo] Email sent successfully to ${notification.to}, messageId: ${data.messageId}`)
            return data
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error"
            this.logger?.error(`[Brevo] Network error while sending email: ${message}`)
            return {}
        }
    }
}
export default BrevoNotificationProvider
