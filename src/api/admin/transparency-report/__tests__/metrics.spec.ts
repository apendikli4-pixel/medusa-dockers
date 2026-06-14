import { actionOf, countAction, summarizeConscience } from "../metrics"

describe("transparency-report metrics (tek kaynak: memory_truth)", () => {
    describe("actionOf", () => {
        it("metadata.action'ı okur", () => {
            expect(actionOf({ metadata: { action: "conscience_deny" } })).toBe("conscience_deny")
        })
        it("eksik/boş metadata'da boş string döner (patlamaz)", () => {
            expect(actionOf({ metadata: null })).toBe("")
            expect(actionOf({})).toBe("")
            expect(actionOf({ metadata: {} })).toBe("")
        })
    })

    describe("countAction", () => {
        it("yalnızca eşleşen action'ları sayar", () => {
            const rows = [
                { metadata: { action: "product_search" } },
                { metadata: { action: "product_search" } },
                { metadata: { action: "chat" } },
            ]
            expect(countAction(rows, "product_search")).toBe(2)
            expect(countAction(rows, "chat")).toBe(1)
            expect(countAction(rows, "yok")).toBe(0)
        })
    })

    describe("summarizeConscience", () => {
        it("AI verdict'lerini memory_truth'tan sayar (tek kaynak)", () => {
            const truth = [
                { metadata: { action: "conscience_deny" } },
                { metadata: { action: "conscience_allow" } },
                { metadata: { action: "conscience_allow" } },
                { metadata: { action: "product_search" } }, // alakasız — sayılmaz
            ]
            const s = summarizeConscience(truth, [])
            expect(s.aiDenies).toBe(1)
            expect(s.aiAllows).toBe(2)
            expect(s.injectionBlocks).toBe(0)
            expect(s.blockedActions).toBe(1)
            expect(s.allowedActions).toBe(2)
            expect(s.totalVerdicts).toBe(3)
        })

        it("injection bloklarını (conscience_log critical) blockedActions'a katar", () => {
            const truth = [{ metadata: { action: "conscience_deny" } }]
            const conscience = [{ level: "critical" }, { level: "critical" }, { level: "info" }]
            const s = summarizeConscience(truth, conscience)
            expect(s.injectionBlocks).toBe(2)
            expect(s.aiDenies).toBe(1)
            expect(s.blockedActions).toBe(3) // 1 AI deny + 2 injection
            expect(s.allowedActions).toBe(0)
            expect(s.totalVerdicts).toBe(3)
        })

        it("boş kaynaklarda her şey 0 (uydurma değer yok)", () => {
            expect(summarizeConscience([], [])).toEqual({
                blockedActions: 0,
                allowedActions: 0,
                totalVerdicts: 0,
                aiDenies: 0,
                aiAllows: 0,
                injectionBlocks: 0,
            })
        })
    })
})
