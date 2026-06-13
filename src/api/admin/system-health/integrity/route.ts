/**
 * GET /admin/system-health/integrity
 * ═══════════════════════════════════
 * Canlı Bütünlük Denetçisi'ni TALEP ÜZERİNE çalıştırır ve dürüst kararı döndürür.
 * (Zamanlanmış sürümü: src/jobs/integrity-heartbeat.ts — saatlik kalp atışı.)
 *
 * /admin/* yolu mevcut admin kimlik doğrulama middleware'i ile korunur.
 */
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { runIntegrityChecks } from "../../../../lib/integrity/run"

export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
    const logger = req.scope.resolve("logger")
    let query: { graph: (cfg: Record<string, unknown>) => Promise<{ data: unknown[] }> } | null = null
    try {
        query = req.scope.resolve("remoteQuery") as unknown as typeof query
    } catch {
        query = null
    }

    const verdict = await runIntegrityChecks({
        query,
        container: { resolve: (k: string) => req.scope.resolve(k) },
        logger,
        env: process.env,
    })

    // HTTP durumu da dürüst olsun: FAIL → 503 (sağlıksız), aksi halde 200.
    res.status(verdict.overall === "FAIL" ? 503 : 200).json(verdict)
}
