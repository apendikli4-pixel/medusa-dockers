import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

// Request schema: query parameters ?email=...&display_id=...
const TrackOrderSchema = z.object({
    email: z.string().email(),
    display_id: z.string()
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    try {
        const validated = TrackOrderSchema.parse(req.query)

        const remoteQuery = req.scope.resolve("remoteQuery") as any

        // Müşteri bilgisi ve display_id'ye göre order çek.
        // display_id string geldiği için number'a çeviriyoruz, fakat Zod schema ile de parse edilebilirdi.
        const numericDisplayId = parseInt(validated.display_id, 10)
        if (isNaN(numericDisplayId)) {
            return res.status(400).json({ error: "Sipariş numarası geçersiz." })
        }

        const { data: orders } = await remoteQuery.graph({
            entity: "order",
            fields: [
                "id", 
                "display_id", 
                "email", 
                "status", 
                "payment_status", 
                "fulfillment_status", 
                "created_at",
                "items.id",
                "items.title",
                "items.quantity",
                "items.thumbnail",
                "fulfillments.id",
                "fulfillments.tracking_numbers",
                "fulfillments.status",
                "fulfillments.created_at",
                "shipping_address.first_name",
                "shipping_address.last_name",
                "shipping_address.city"
            ],
            filters: {
                email: validated.email,
                display_id: numericDisplayId
            }
        })

        if (!orders || orders.length === 0) {
            return res.status(404).json({ error: "Bu bilgilere ait sipariş bulunamadı." })
        }

        const order = orders[0]

        // Maskeleme: Güvenlik gereği ad soyad gizlenir (Örn: A** G**)
        if (order.shipping_address) {
            const fName = order.shipping_address.first_name || ""
            const lName = order.shipping_address.last_name || ""
            order.shipping_address.first_name = fName.length > 0 ? `${fName.charAt(0)}***` : ""
            order.shipping_address.last_name = lName.length > 0 ? `${lName.charAt(0)}***` : ""
        }

        return res.status(200).json({ order })
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: "Geçersiz parametreler", details: error.issues })
        }
        
        const logger = req.scope.resolve("logger") as any
        logger.error(`[Order Tracking Error]: ${error.message}`)
        
        return res.status(500).json({ error: "Sipariş sorgulanırken bir hata oluştu." })
    }
}
