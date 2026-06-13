import { aggregate } from "../aggregate"
import { runIntegrityChecks } from "../run"
import { DEFAULT_CHECKS } from "../checks"
import type { Check, CheckResult } from "../types"

const mk = (id: string, status: CheckResult["status"]): CheckResult => ({ id, title: id, status, detail: "" })

describe("integrity/aggregate — dürüst karar mantığı", () => {
    it("hepsi OK → genel OK", () => {
        const v = aggregate([mk("a", "OK"), mk("b", "OK")], "t")
        expect(v.overall).toBe("OK")
        expect(v.counts).toEqual({ ok: 2, warn: 0, fail: 0, skipped: 0 })
    })
    it("bir FAIL varsa (OK/WARN olsa bile) → genel FAIL (öncelik)", () => {
        const v = aggregate([mk("a", "OK"), mk("b", "WARN"), mk("c", "FAIL")], "t")
        expect(v.overall).toBe("FAIL")
    })
    it("FAIL yok, WARN var → genel WARN", () => {
        expect(aggregate([mk("a", "OK"), mk("b", "WARN")], "t").overall).toBe("WARN")
    })
    it("hepsi SKIPPED → genel SKIPPED (sahte OK değil, dürüstçe 'bilinmiyor')", () => {
        const v = aggregate([mk("a", "SKIPPED"), mk("b", "SKIPPED")], "t")
        expect(v.overall).toBe("SKIPPED")
        expect(v.summary).toMatch(/doğrulanamadı/i)
    })
    it("checkedAt geçirilen zaman damgasını korur", () => {
        expect(aggregate([mk("a", "OK")], "2026-06-14T00:00:00Z").checkedAt).toBe("2026-06-14T00:00:00Z")
    })
})

describe("integrity/run — istisna güvenlik ağı", () => {
    it("bir kontrol çökerse onu FAIL'e çevirir, diğerlerini durdurmaz", async () => {
        const boom: Check = { id: "boom", title: "patlar", run: async () => { throw new Error("çöktü") } }
        const fine: Check = { id: "fine", title: "iyi", run: async () => mk("fine", "OK") }
        const v = await runIntegrityChecks({ query: null, env: {}, now: "t" }, [boom, fine])
        expect(v.overall).toBe("FAIL")
        const boomRes = v.checks.find((c) => c.id === "boom")
        expect(boomRes?.status).toBe("FAIL")
        expect(boomRes?.detail).toMatch(/istisna|çöktü/i)
        expect(v.checks.find((c) => c.id === "fine")?.status).toBe("OK")
    })

    it("query null iken çökmeden çalışır (kontroller SKIPPED'e düşer, çöküş FAIL'i değil)", async () => {
        const v = await runIntegrityChecks({ query: null, env: {}, now: "t" })
        // search-isolation Meili env'i yok → SKIPPED; query-bağımlı kontroller SKIPPED; ai WARN.
        expect(v.checks.length).toBe(DEFAULT_CHECKS.length)
        expect(v.checks.find((c) => c.id === "database")?.status).toBe("SKIPPED")
        expect(v.checks.find((c) => c.id === "search-isolation")?.status).toBe("SKIPPED")
    })
})

describe("integrity/checks — gerçek davranış (mock servislerle)", () => {
    const env = {}

    it("search-isolation: products indeksinde sales_channel_ids YOKSA FAIL (sızıntı riski)", async () => {
        // Meili env tanımlıyken, getFilterableAttributes sales_channel_ids içermiyorsa FAIL beklenir.
        const v = await runIntegrityChecks(
            { query: null, env: { MEILISEARCH_HOST: "http://x", MEILISEARCH_MASTER_KEY: "k" }, now: "t" },
            DEFAULT_CHECKS.filter((c) => c.id === "search-isolation")
        )
        // meilisearch import gerçek client kurar ama bağlanamaz → FAIL (erişilemedi).
        // Her iki durumda da (filtre eksik / erişilemedi) sonuç FAIL olmalı — sahte OK ASLA.
        expect(v.checks[0].status).toBe("FAIL")
    })

    it("ai-provider: OLLAMA_API_URL yoksa WARN, varsa OK", async () => {
        const warn = await runIntegrityChecks({ query: null, env: {}, now: "t" }, DEFAULT_CHECKS.filter((c) => c.id === "ai-provider"))
        expect(warn.checks[0].status).toBe("WARN")
        const ok = await runIntegrityChecks({ query: null, env: { OLLAMA_API_URL: "http://x:11434" }, now: "t" }, DEFAULT_CHECKS.filter((c) => c.id === "ai-provider"))
        expect(ok.checks[0].status).toBe("OK")
    })

    it("tenants-present: tenant varsa OK, yoksa WARN", async () => {
        const q = (rows: unknown[]) => ({ graph: async () => ({ data: rows }) })
        const ok = await runIntegrityChecks({ query: q([{ id: "t1" }]), env, now: "t" }, DEFAULT_CHECKS.filter((c) => c.id === "tenants-present"))
        expect(ok.checks[0].status).toBe("OK")
        const warn = await runIntegrityChecks({ query: q([]), env, now: "t" }, DEFAULT_CHECKS.filter((c) => c.id === "tenants-present"))
        expect(warn.checks[0].status).toBe("WARN")
    })
})
