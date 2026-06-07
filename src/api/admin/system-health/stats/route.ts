import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    const aynaService = req.scope.resolve("ayna")
    
    try {
        // Query MemoryTruth for stats
        const [events, count] = await (aynaService as any).listAndCountMemoryTruths({
            take: 1000 // Get a reasonable sample for stats
        }, {
            order: { created_at: "DESC" }
        })

        const now = new Date()
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        const stats = {
            total_events: count,
            last_24h_events: events.filter((e: any) => new Date(e.created_at) > last24h).length,
            error_count: events.filter((e: any) => e.content.includes("error") || e.content.includes("failed")).length,
            success_rate: count > 0 ? Math.round(((count - events.filter((e: any) => e.content.includes("error")).length) / count) * 100) : 100,
            last_event: events.length > 0 ? events[0].content : "Henüz olay yok"
        }

        res.json(stats)
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error"
        res.status(500).json({ error: "İşlem sırasında bir hata oluştu." })
    }
}
