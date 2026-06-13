/**
 * CANLI BÜTÜNLÜK DENETÇİSİ — Karar Birleştirici (saf fonksiyon)
 * ════════════════════════════════════════════════════════════
 * Kontrol sonuçlarını tek bir dürüst karara indirger. Yan etkisiz, deterministik —
 * bu yüzden ayrı bir test paketiyle (integrity.spec.ts) tam kapsamlı doğrulanır.
 *
 * Statü önceliği: bir tek FAIL → genel FAIL. FAIL yoksa bir tek WARN → WARN.
 * Hepsi atlandıysa (SKIPPED) → genel SKIPPED ("bilinmiyor", sahte OK değil).
 */
import type { CheckResult, CheckStatus, IntegrityVerdict } from "./types"

export function aggregate(checks: CheckResult[], checkedAt: string): IntegrityVerdict {
    const counts = { ok: 0, warn: 0, fail: 0, skipped: 0 }
    for (const c of checks) {
        if (c.status === "OK") counts.ok++
        else if (c.status === "WARN") counts.warn++
        else if (c.status === "FAIL") counts.fail++
        else counts.skipped++
    }

    let overall: CheckStatus
    if (counts.fail > 0) overall = "FAIL"
    else if (counts.warn > 0) overall = "WARN"
    else if (counts.ok > 0) overall = "OK"
    else overall = "SKIPPED" // hiçbir şey doğrulanamadı — dürüstçe "bilinmiyor"

    const summary =
        overall === "OK"
            ? `Tüm kritik kontroller geçti (${counts.ok} OK).`
            : overall === "SKIPPED"
                ? `Hiçbir kontrol çalıştırılamadı (${counts.skipped} atlandı) — sistem durumu doğrulanamadı.`
                : `${counts.fail} BAŞARISIZ, ${counts.warn} uyarı, ${counts.ok} OK, ${counts.skipped} atlandı.`

    return { overall, checkedAt, summary, counts, checks }
}
