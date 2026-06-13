/**
 * CANLI BÜTÜNLÜK DENETÇİSİ — Öz-Onarım (Self-Healing)
 * ═══════════════════════════════════════════════════
 * Organizmanın "kendini onarma" yeteneği — ama PROJENİN ALTIN KURALIYLA: bir onarımın
 * "düzeltildi" sayılması için, onarımdan SONRA ilgili kontrol YENİDEN çalıştırılıp GEÇMELİDİR.
 * Yani sahte "onarıldı" imkânsızdır; her düzeltme yeniden-kontrolle kanıtlanır.
 *
 * Güvenlik: Yalnızca `safeToAutoHeal` (idempotent, yıkıcı olmayan) onarıcılar otomatik koşar.
 * Diğerleri "insan onayı gerekir" olarak dürüstçe işaretlenir, çalıştırılmaz.
 */
import type { Check, CheckContext, HealResult, IntegrityVerdict, SelfHealReport } from "./types"
import { DEFAULT_CHECKS } from "./checks"

export async function runSelfHeal(
    ctx: CheckContext,
    verdict: IntegrityVerdict,
    checks: Check[] = DEFAULT_CHECKS,
    opts: { onlySafe?: boolean } = {}
): Promise<SelfHealReport> {
    const onlySafe = opts.onlySafe ?? true
    const attempts: HealResult[] = []

    // Yalnızca BAŞARISIZ kontroller onarım adayıdır (WARN/SKIPPED otomatik onarılmaz).
    const failing = verdict.checks.filter((c) => c.status === "FAIL")

    for (const fc of failing) {
        const chk = checks.find((c) => c.id === fc.id)
        if (!chk?.heal) continue // onarıcısı yok — atla

        if (onlySafe && !chk.safeToAutoHeal) {
            attempts.push({
                id: chk.id, attempted: false, changed: false, resolved: false,
                detail: "Onarıcı mevcut ama güvenli-otomatik-onarım için işaretli değil — insan onayı gerekir.",
            })
            continue
        }

        try {
            const healed = await chk.heal(ctx)
            // KANIT ADIMI: onarımdan sonra kontrolü yeniden çalıştır.
            const recheck = await chk.run(ctx)
            const resolved = recheck.status === "OK"
            attempts.push({
                id: chk.id, attempted: true, changed: healed.changed, resolved,
                detail: resolved
                    ? `Onarıldı ve yeniden-kontrolle DOĞRULANDI: ${healed.detail}`
                    : `Onarım denendi ama kontrol hâlâ ${recheck.status}: ${recheck.detail}`,
            })
        } catch (e: unknown) {
            attempts.push({
                id: chk.id, attempted: true, changed: false, resolved: false,
                detail: `Onarım istisna fırlattı: ${e instanceof Error ? e.message : String(e)}`,
            })
        }
    }

    return {
        healedAt: ctx.now ?? new Date().toISOString(),
        attempts,
        fixed: attempts.filter((a) => a.resolved).map((a) => a.id),
        unresolved: attempts.filter((a) => a.attempted && !a.resolved).map((a) => a.id),
    }
}
