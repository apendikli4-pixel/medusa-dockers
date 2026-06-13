import type { MedusaContainer } from "@medusajs/framework/types"
import { runIntegrityChecks, runSelfHeal } from "../lib/integrity/run"
import type { CheckContext } from "../lib/integrity/run"

/**
 * KALP ATIŞI — Canlı Bütünlük Denetçisi (zamanlanmış, öz-onarımlı)
 * ═══════════════════════════════════════════════════════════════
 * Saatte bir, canlı sistemin mimari değişmezlerini deterministik kontrol eder. Sonucu
 * DÜRÜSTÇE vicdan/hafıza kaydına (recordTruth) yazar; FAIL'de logger.error ile uyarır.
 *
 * ÖZ-ONARIM (opt-in, güvenli): INTEGRITY_AUTOHEAL=true ise, güvenli (idempotent) onarıcısı
 * olan BAŞARISIZ kontroller otomatik onarılır — ama her onarım yeniden-kontrolle KANITLANIR;
 * sahte "düzeltildi" imkânsızdır. Varsayılan KAPALI: prod'da sessiz mutasyon yapmaz.
 *
 * Derleme-zamanı geçidinin (pre-commit + CI) çalışma-zamanı tamamlayıcısıdır:
 * orada "bozuk kod giremez", burada "bozulmuş canlı durum sessiz kalmaz ve mümkünse onarılır".
 */
export default async function integrityHeartbeatJob(container: MedusaContainer): Promise<void> {
    const logger = container.resolve("logger") as { info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void }

    let query: CheckContext["query"] = null
    try {
        query = container.resolve("remoteQuery") as unknown as CheckContext["query"]
    } catch {
        query = null
    }

    const ctx: CheckContext = {
        query,
        container: { resolve: (k: string) => container.resolve(k) },
        logger,
        env: process.env,
    }

    let verdict = await runIntegrityChecks(ctx)
    let healedIds: string[] = []
    let unresolvedIds: string[] = []

    // ─── Öz-onarım (opt-in) ───
    const autoHeal = process.env.INTEGRITY_AUTOHEAL === "true"
    const healableFails = verdict.checks.filter((c) => c.status === "FAIL")
    if (verdict.overall === "FAIL" && healableFails.length > 0) {
        if (autoHeal) {
            const report = await runSelfHeal(ctx, verdict, undefined, { onlySafe: true })
            healedIds = report.fixed
            unresolvedIds = report.unresolved
            if (report.fixed.length > 0) {
                logger.info(`[Heartbeat] 🔧 Öz-onarım: ${report.fixed.join(", ")} düzeltildi ve doğrulandı. Yeniden değerlendiriliyor...`)
                verdict = await runIntegrityChecks(ctx) // onarım sonrası DÜRÜST yeniden değerlendirme
            }
            if (report.unresolved.length > 0) {
                logger.warn(`[Heartbeat] 🔧 Öz-onarım çözemedi: ${report.unresolved.join(", ")} — manuel müdahale gerekli.`)
            }
        } else {
            logger.warn("[Heartbeat] Öz-onarım KAPALI (INTEGRITY_AUTOHEAL!=true). Onarılabilir sorunlar manuel kalıyor; gerekirse POST /admin/system-health/integrity/heal.")
        }
    }

    // Dürüst kayıt: kalp atışını vicdan/hafıza günlüğüne yaz (sessiz başarı/başarısızlık yok).
    const attention = verdict.checks
        .filter((c) => c.status === "FAIL" || c.status === "WARN")
        .map((c) => ({ id: c.id, status: c.status, detail: c.detail }))
    try {
        const ayna = container.resolve("ayna") as { recordTruth?: (a: string, b: string, d: Record<string, unknown>) => Promise<unknown> }
        await ayna?.recordTruth?.(
            "system",
            verdict.overall === "FAIL" ? "integrity_heartbeat_fail" : "integrity_heartbeat",
            { overall: verdict.overall, summary: verdict.summary, counts: verdict.counts, attention, healed: healedIds, unresolved: unresolvedIds }
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
        logger.info(`[Heartbeat] ✓ ${verdict.summary}${healedIds.length ? ` (öz-onarım: ${healedIds.join(", ")})` : ""}`)
    }
}

export const config = {
    name: "integrity-heartbeat",
    schedule: "0 * * * *", // her saat başı
}
