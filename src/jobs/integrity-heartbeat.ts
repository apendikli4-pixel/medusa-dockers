import type { MedusaContainer } from "@medusajs/framework/types"
import { runIntegrityChecks } from "../lib/integrity/run"

/**
 * KALP ATIŞI — Canlı Bütünlük Denetçisi (zamanlanmış)
 * ═══════════════════════════════════════════════════
 * Saatte bir, canlı sistemin mimari değişmezlerini deterministik kontrol eder. Sonucu
 * DÜRÜSTÇE vicdan/hafıza kaydına (recordTruth) yazar — böylece şeffaflık panelinde görünür.
 * FAIL durumunda logger.error ile yüksek-görünürlüklü uyarı basar (alerting kancası burası).
 *
 * Bu, derleme-zamanı invariant geçidinin (pre-commit + CI) çalışma-zamanı tamamlayıcısıdır:
 * orada "bozuk kod giremez", burada "bozulmuş canlı durum sessiz kalmaz".
 */
export default async function integrityHeartbeatJob(container: MedusaContainer): Promise<void> {
    const logger = container.resolve("logger") as { info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void }

    let query: { graph: (cfg: Record<string, unknown>) => Promise<{ data: unknown[] }> } | null = null
    try {
        query = container.resolve("remoteQuery") as unknown as typeof query
    } catch {
        query = null
    }

    const verdict = await runIntegrityChecks({
        query,
        container: { resolve: (k: string) => container.resolve(k) },
        logger,
        env: process.env,
    })

    // Dürüst kayıt: kalp atışını vicdan/hafıza günlüğüne yaz (sessiz başarı/başarısızlık yok).
    const attention = verdict.checks
        .filter((c) => c.status === "FAIL" || c.status === "WARN")
        .map((c) => ({ id: c.id, status: c.status, detail: c.detail }))
    try {
        const ayna = container.resolve("ayna") as { recordTruth?: (a: string, b: string, d: Record<string, unknown>) => Promise<unknown> }
        await ayna?.recordTruth?.(
            "system",
            verdict.overall === "FAIL" ? "integrity_heartbeat_fail" : "integrity_heartbeat",
            { overall: verdict.overall, summary: verdict.summary, counts: verdict.counts, attention }
        )
    } catch (e: unknown) {
        logger.warn(`[Heartbeat] vicdan kaydı yazılamadı: ${e instanceof Error ? e.message : String(e)}`)
    }

    // Görünür sonuç + alerting kancası.
    if (verdict.overall === "FAIL") {
        logger.error(`[Heartbeat] ❌ BÜTÜNLÜK BAŞARISIZ — ${verdict.summary} | Dikkat: ${JSON.stringify(attention)}`)
    } else if (verdict.overall === "WARN") {
        logger.warn(`[Heartbeat] ⚠️ ${verdict.summary} | Dikkat: ${JSON.stringify(attention)}`)
    } else {
        logger.info(`[Heartbeat] ✓ ${verdict.summary}`)
    }
}

export const config = {
    name: "integrity-heartbeat",
    schedule: "0 * * * *", // her saat başı
}
