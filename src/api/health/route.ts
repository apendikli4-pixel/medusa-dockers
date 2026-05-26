/**
 * GET /health — Liveness probe
 * Sürecin çalışıp çalışmadığını bildirir. Bağımlılıkları kontrol etmez.
 * Docker/Kubernetes liveness probe için kullanılır — başarısızlık restart tetikler.
 */
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = (_req: MedusaRequest, res: MedusaResponse): void => {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor(process.uptime()),
    })
}
