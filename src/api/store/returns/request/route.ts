import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

const ReturnRequestSchema = z.object({
    email: z.string().email(),
    display_id: z.string(),
    reason: z.string().min(10)
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    try {
        const body = ReturnRequestSchema.parse(req.body)
        const remoteQuery = req.scope.resolve("remoteQuery") as any
        const rmaModule = req.scope.resolve("rma") as any

        const numericDisplayId = parseInt(body.display_id, 10)
        if (isNaN(numericDisplayId)) {
            return res.status(400).json({ error: "Sipariş numarası geçersiz." })
        }

        // ─── TENANT İZOLASYONU (cross-tenant sızıntı önlemi) ───
        // Auth'suz + email ile order sorgusu; order tablosunun RLS'i yok. AKTİF mağazanın
        // sales_channel'ı ile sınırlanmazsa başka mağazanın siparişine iade açılabilir.
        let salesChannelId = (req.body as Record<string, unknown>)?.sales_channel_id as string | undefined
        if (!salesChannelId && req.tenant_id) {
            const { data: t } = await remoteQuery.graph({
                entity: "tenant",
                fields: ["sales_channel.id"],
                filters: { id: req.tenant_id },
            })
            salesChannelId = t?.[0]?.sales_channel?.id
        }
        if (!salesChannelId) {
            return res.status(404).json({ error: "Sipariş bulunamadı veya e-posta eşleşmiyor." })
        }

        // Siparişi bul ve 14 gün kuralını kontrol et
        const { data: orders } = await remoteQuery.graph({
            entity: "order",
            fields: ["id", "display_id", "email", "created_at"],
            filters: {
                email: body.email,
                display_id: numericDisplayId,
                sales_channel_id: salesChannelId
            }
        })

        if (!orders || orders.length === 0) {
            return res.status(404).json({ error: "Sipariş bulunamadı veya e-posta eşleşmiyor." })
        }

        const order = orders[0]
        const orderDate = new Date(order.created_at)
        const now = new Date()
        const diffTime = Math.abs(now.getTime() - orderDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays > 14) {
            return res.status(400).json({ error: "İade süresi (14 gün) dolmuştur." })
        }

        // İade talebi oluştur
        const returnRequest = await rmaModule.createReturnRequests({
            order_id: order.id,
            email: order.email,
            reason: body.reason,
            status: "pending"
        })

        const logger = req.scope.resolve("logger") as any
        logger.info(`[RMA] Yeni iade talebi oluşturuldu: Sipariş #${body.display_id}`)

        return res.status(200).json({ success: true, request: returnRequest })
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: "Geçersiz form verileri", details: error.issues })
        }
        return res.status(500).json({ error: error.message })
    }
}
