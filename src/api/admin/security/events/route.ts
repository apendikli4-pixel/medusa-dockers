import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { getRecentSecurityEvents } from "../../../../lib/security/security-events"

const QuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(500).default(100),
    type: z
        .enum(["ADMIN_IP_BLOCKED", "ADMIN_IP_OBSERVED", "INJECTION_BLOCKED", "RATE_LIMIT_EXCEEDED"])
        .optional(),
})

/**
 * GET /admin/security/events
 * Son güvenlik olaylarını döndürür (en yeni önce). Admin-auth + (enforce'ta) IP korumalı.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const parsed = QuerySchema.safeParse(req.query)
    if (!parsed.success) {
        return res.status(400).json({ error: "Geçersiz istek", details: parsed.error.issues })
    }
    const events = getRecentSecurityEvents(parsed.data)
    return res.status(200).json({ count: events.length, events })
}
