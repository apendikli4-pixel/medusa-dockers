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

        // actor/action MemoryTruth'ta top-level KOLON DEĞİL — metadata içinde yaşar
        // (bkz. memory-service.recordTruth). Top-level okumak undefined.includes → çökme.
        const actorOf = (e: any): string => String(e?.metadata?.actor ?? "system")
        const actionOf = (e: any): string => String(e?.metadata?.action ?? "event")
        const isError = (e: any): boolean => {
            const c = String(e?.content ?? "")
            const a = actionOf(e)
            return /error|failed|hata|başarısız/i.test(c) || /error|deny|fail/i.test(a)
        }
        const errorCount = events.filter(isError).length

        const stats = {
            total_events: count,
            last_24h_events: events.filter((e: any) => new Date(e.created_at) > last24h).length,
            error_count: errorCount,
            success_rate: count > 0 ? Math.round(((count - errorCount) / count) * 100) : 100,
            last_event: events.length > 0 ? events[0].content : "Henüz olay yok",
            recent_events: events.slice(0, 15).map((e: any) => ({
                id: e.id,
                created_at: e.created_at,
                actor: actorOf(e),
                action: actionOf(e),
                content: e.content
            }))
        }

        res.json(stats)
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error"
        res.status(500).json({ error: "İşlem sırasında bir hata oluştu." })
    }
}
