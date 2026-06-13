import { runIntegrityChecks, runSelfHeal } from "../run"
import type { Check, CheckResult } from "../types"

const ctx = { query: null, env: {}, now: "t" }

/** Durum-bilgili sahte kontrol: onarım çağrılınca (ve healFixes ise) FAIL→OK döner. */
function makeCheck(opts: {
    id: string
    initial?: CheckResult["status"]
    safe?: boolean
    hasHeal?: boolean
    healFixes?: boolean
    healThrows?: boolean
}): Check {
    let healed = false
    return {
        id: opts.id,
        title: opts.id,
        safeToAutoHeal: opts.safe,
        run: async () => ({
            id: opts.id,
            title: opts.id,
            status: healed && opts.healFixes ? "OK" : (opts.initial ?? "FAIL"),
            detail: "",
        }),
        heal: opts.hasHeal
            ? async () => {
                if (opts.healThrows) throw new Error("onarım patladı")
                healed = true
                return { changed: true, detail: "ayar yeniden uygulandı" }
            }
            : undefined,
    }
}

async function verdictFor(checks: Check[]) {
    return runIntegrityChecks(ctx, checks)
}

describe("integrity/heal — kanıtlı öz-onarım", () => {
    it("güvenli onarıcı sorunu çözerse: yeniden-kontrol OK → 'fixed' (kanıtlı düzeltme)", async () => {
        const checks = [makeCheck({ id: "x", safe: true, hasHeal: true, healFixes: true })]
        const report = await runSelfHeal(ctx, await verdictFor(checks), checks)
        expect(report.fixed).toEqual(["x"])
        expect(report.unresolved).toEqual([])
        expect(report.attempts[0]).toMatchObject({ attempted: true, changed: true, resolved: true })
    })

    it("onarım işe yaramazsa: yeniden-kontrol hâlâ FAIL → 'fixed' DEĞİL, dürüstçe 'unresolved'", async () => {
        const checks = [makeCheck({ id: "y", safe: true, hasHeal: true, healFixes: false })]
        const report = await runSelfHeal(ctx, await verdictFor(checks), checks)
        expect(report.fixed).toEqual([])
        expect(report.unresolved).toEqual(["y"])
        expect(report.attempts[0].resolved).toBe(false)
        expect(report.attempts[0].detail).toMatch(/hâlâ|FAIL/i)
    })

    it("onarıcısı olmayan BAŞARISIZ kontrol için onarım denenmez", async () => {
        const checks = [makeCheck({ id: "z", safe: true, hasHeal: false })]
        const report = await runSelfHeal(ctx, await verdictFor(checks), checks)
        expect(report.attempts).toEqual([])
        expect(report.fixed).toEqual([])
    })

    it("güvenli-işaretli OLMAYAN onarıcı otomatik koşmaz (insan onayı), onlySafe:false ile koşar", async () => {
        const unsafe = () => [makeCheck({ id: "w", safe: false, hasHeal: true, healFixes: true })]
        const c1 = unsafe()
        const blocked = await runSelfHeal(ctx, await verdictFor(c1), c1, { onlySafe: true })
        expect(blocked.attempts[0]).toMatchObject({ attempted: false, resolved: false })
        expect(blocked.attempts[0].detail).toMatch(/insan onayı/i)
        expect(blocked.fixed).toEqual([])

        const c2 = unsafe()
        const forced = await runSelfHeal(ctx, await verdictFor(c2), c2, { onlySafe: false })
        expect(forced.fixed).toEqual(["w"])
    })

    it("onarım istisna fırlatırsa dürüstçe çözülemedi sayılır (sahte başarı yok)", async () => {
        const checks = [makeCheck({ id: "boom", safe: true, hasHeal: true, healThrows: true })]
        const report = await runSelfHeal(ctx, await verdictFor(checks), checks)
        expect(report.fixed).toEqual([])
        expect(report.attempts[0]).toMatchObject({ attempted: true, resolved: false })
        expect(report.attempts[0].detail).toMatch(/istisna|patladı/i)
    })

    it("yalnızca FAIL kontroller onarılır — WARN olan (onarıcısı olsa bile) denenmez", async () => {
        const checks = [makeCheck({ id: "warnc", initial: "WARN", safe: true, hasHeal: true, healFixes: true })]
        const report = await runSelfHeal(ctx, await verdictFor(checks), checks)
        expect(report.attempts).toEqual([])
    })
})
