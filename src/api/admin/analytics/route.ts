import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ga4Service } from "../../../lib/analytics/ga4-service"

export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    try {
        const days = parseInt(req.query.days as string) || 7
        
        // Paralel olarak hem genel istatistikleri hem de en çok izlenen sayfaları çek
        const [stats, topPages] = await Promise.all([
            ga4Service.getTrafficStats(days),
            ga4Service.getTopPages(days, 5)
        ])

        res.json({
            stats,
            topPages,
            days
        })
    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any
        const message = error instanceof Error ? error.message : "Unknown error"
        logger.error(`[Admin Analytics GET] ${message}`)
        
        res.status(500).json({ 
            error: "Analitik verileri alınırken bir hata oluştu.",
            details: message 
        })
    }
}
