/**
 * INVARIANT LINTER — KURAL TEST PAKETİ
 * ════════════════════════════════════
 * Deterministik denetçinin kendisi de denetimsiz koddur; bir regresyon sessizce bir
 * kuralı devre dışı bırakabilir. Bu test, linter'ı gerçek fixture dosyalarına karşı
 * UÇTAN UCA çalıştırır ve her kuralın doğru-pozitif/doğru-negatif davrandığını kanıtlar.
 *
 * Fixture'lar scripts/audit/fixtures/ altında (ÜRETİM KODU DEĞİL). AUDIT_TEST_MODE=1
 * linter'ın src/ yol kısıtını gevşetir; böylece fixture'lar doğrudan taranabilir.
 */
import { execSync } from "node:child_process"
import { join } from "node:path"

const ROOT = process.cwd()
const LINTER = join(ROOT, "scripts", "audit", "invariant-lint.mjs")
const FIX = join(ROOT, "scripts", "audit", "fixtures")

type Finding = { file: string; line: number; rule: string; severity: string; message: string }
type Report = { scanned: number; errors: number; warnings: number; findings: Finding[] }

function run(fixture: string): Report {
    const cmd = `node "${LINTER}" --json "${join(FIX, fixture)}"`
    try {
        const out = execSync(cmd, { encoding: "utf8", env: { ...process.env, AUDIT_TEST_MODE: "1" } })
        return JSON.parse(out)
    } catch (e: any) {
        // Linter HATA bulunca exit 1 döner; JSON çıktısı yine stdout'tadır.
        if (e.stdout) return JSON.parse(e.stdout.toString())
        throw e
    }
}

const rules = (r: Report) => r.findings.map((f) => f.rule)

describe("invariant-lint: rls-bypass-forbidden", () => {
    it("tenant izolasyon bypass desenlerini HATA olarak yakalar", () => {
        const r = run("rls-bad.ts")
        expect(rules(r)).toContain("rls-bypass-forbidden")
        expect(r.errors).toBeGreaterThanOrEqual(1)
    })
    it("normal tenant-bağlamlı sorguyu yakalamaz (false-positive yok)", () => {
        const r = run("rls-good.ts")
        expect(rules(r)).not.toContain("rls-bypass-forbidden")
    })
})

describe("invariant-lint: immutable-memory", () => {
    it("hafıza sert-silme çağrılarını HATA olarak yakalar", () => {
        const r = run("memory-bad.ts")
        expect(rules(r)).toContain("immutable-memory")
        expect(r.errors).toBeGreaterThanOrEqual(1)
    })
    it("is_archived ile yumuşak işareti yakalamaz (false-positive yok)", () => {
        const r = run("memory-good.ts")
        expect(rules(r)).not.toContain("immutable-memory")
    })
})

describe("invariant-lint: sealed-file-guard", () => {
    it("manifest'te olmayan @sealed dosyayı HATA olarak yakalar", () => {
        const r = run("sealed-bad.ts")
        expect(rules(r)).toContain("sealed-file-guard")
        expect(r.errors).toBeGreaterThanOrEqual(1)
    })
})
