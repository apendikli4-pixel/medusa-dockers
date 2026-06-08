import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

const ContactSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    subject: z.string().optional(),
    message: z.string().min(10)
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    try {
        const body = ContactSchema.parse(req.body)
        const contactModule = req.scope.resolve("contact") as any

        // Veritabanına kaydet
        const contactMessage = await contactModule.createContactMessages({
            name: body.name,
            email: body.email,
            phone: body.phone,
            subject: body.subject,
            message: body.message,
            status: "unread"
        })

        const logger = req.scope.resolve("logger") as any
        logger.info(`[Contact] Yeni mesaj alındı: ${body.name} (${body.email})`)

        // Email Notification Mock
        // Normalde burada notification module ile yöneticiye e-posta atılır.
        logger.info(`[Email] Yöneticiye bildirim e-postası gönderildi: ${body.subject || "Yeni İletişim Mesajı"}`)

        return res.status(200).json({ success: true, message: contactMessage })
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: "Geçersiz form verileri", details: error.issues })
        }
        return res.status(500).json({ error: error.message })
    }
}
