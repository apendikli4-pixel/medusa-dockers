/**
 * POST /admin/system-health/integrity/heal
 * ═════════════════════════════════════════
 * Canlı Bütünlük Denetçisi'ni çalıştırır ve güvenli (idempotent) onarıcısı olan BAŞARISIZ
 * kontrolleri onarmayı dener. Her onarım yeniden-kontrolle KANITLANIR — yanıt yalnızca
 * gerçekten doğrulanmış düzeltmeleri 'fixed' olarak bildirir (sahte başarı yok).
 *
 * Onarımdan sonraki DÜRÜST yeni durum da yanıta eklenir. /admin/* admin auth ile korunur.
 */
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { runIntegrityChecks, runSelfHeal } from "../../../../../lib/integrity/run"
import type { CheckContext } from "../../../../../lib/integrity/run"

export const POST = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
    const logger = req.scope.resolve("logger")
    let query: CheckContext["query"] = null
    try {
        query = req.scope.resolve("remoteQuery") as unknown as CheckContext["query"]
    } catch {
        query = null
    }

    const ctx: CheckContext = {
        query,
        container: { resolve: (k: string) => req.scope.resolve(k) },
        logger,
        env: process.env,
    }

    const before = await runIntegrityChecks(ctx)
    const heal = await runSelfHeal(ctx, before, undefined, { onlySafe: true })
    const after = await runIntegrityChecks(ctx) // onarım sonrası dürüst yeni durum

    res.status(after.overall === "FAIL" ? 503 : 200).json({
        before: { overall: before.overall, summary: before.summary },
        heal,
        after,
    })
}
