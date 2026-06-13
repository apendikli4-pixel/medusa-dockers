/**
 * CANLI BÜTÜNLÜK DENETÇİSİ — Çalıştırıcı
 * ══════════════════════════════════════
 * Tüm kontrolleri sırayla, izole çalıştırır. Bir kontrol istisna fırlatırsa onu sessizce
 * yutmaz — dürüstçe FAIL'e çevirir (bir kontrolün çökmesi diğerlerini durdurmaz).
 * Sonuçları saf `aggregate` ile tek karara indirger.
 */
import type { Check, CheckContext, IntegrityVerdict } from "./types"
import { DEFAULT_CHECKS } from "./checks"
import { aggregate } from "./aggregate"

export async function runIntegrityChecks(
    ctx: CheckContext,
    checks: Check[] = DEFAULT_CHECKS
): Promise<IntegrityVerdict> {
    const results = []
    for (const chk of checks) {
        try {
            results.push(await chk.run(ctx))
        } catch (e: unknown) {
            results.push({
                id: chk.id,
                title: chk.title,
                status: "FAIL" as const,
                detail: `Kontrol istisna fırlattı: ${e instanceof Error ? e.message : String(e)}`,
            })
        }
    }
    return aggregate(results, ctx.now ?? new Date().toISOString())
}

export { DEFAULT_CHECKS } from "./checks"
export { aggregate } from "./aggregate"
export type { IntegrityVerdict, CheckResult, CheckContext, Check } from "./types"
