import AynaDiagnosticService from "../services/diagnostic-service"

/**
 * DÜRÜSTLÜK REGRESYON TESTİ
 * runAutoFix bir zamanlar yapmadığı işi "System auto-fixed successfully" diye RAPORLUYORDU
 * (Madde 3 ihlali, üstelik Ayna AI aracına bağlıydı). Bu test, o yalanın geri gelmemesini
 * garanti eder: runAutoFix ASLA sahte başarı dönmez ve değişiklik yapmadığını açıkça söyler.
 */
const logger = { info: () => {}, error: () => {}, warn: () => {}, debug: () => {} } as any

describe("AynaDiagnosticService.runAutoFix — dürüstlük garantisi", () => {
    it("query yokken sahte başarı DÖNDÜRMEZ; hiçbir değişiklik yapmadığını bildirir", async () => {
        const svc = new AynaDiagnosticService({ logger })
        const r: any = await svc.runAutoFix(undefined)
        expect(r.status).toBe("unavailable")
        expect(r.fixed).toEqual([])
        expect(r.message).toMatch(/Hiçbir değişiklik yapılmadı/i)
        expect(r.message).not.toMatch(/auto-fixed successfully/i)
    })

    it("denetim temiz olsa bile 'onarıldı' demez; yalnızca sorun yok + değişiklik yok der", async () => {
        const svc = new AynaDiagnosticService({ logger })
        const query: any = { graph: async () => ({ data: [{ id: "x" }] }) }
        const r: any = await svc.runAutoFix(query)
        expect(r.fixed).toEqual([])
        expect(r.message).toMatch(/Hiçbir değişiklik yapılmadı/i)
        expect(r.message).not.toMatch(/auto-fixed successfully/i)
    })

    it("denetimde WARNING/ERROR varsa manuel-inceleme listesine alır (sessiz geçmez)", async () => {
        const svc = new AynaDiagnosticService({ logger })
        // Boş region listesi → auditRegions "WARNING: No regions found" döndürür.
        const query: any = {
            graph: async ({ entity }: any) => ({ data: entity === "region" ? [] : [{ id: "x" }] }),
        }
        const r: any = await svc.runAutoFix(query)
        expect(r.status).toBe("needs_manual_review")
        expect(r.needs_manual.join(" ")).toMatch(/regions/i)
        expect(r.fixed).toEqual([])
    })
})
