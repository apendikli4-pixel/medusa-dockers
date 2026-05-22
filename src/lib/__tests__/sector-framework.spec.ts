/**
 * Sector Framework — Unit Tests
 *
 * Test stratejisi:
 *   - Pure logic test edilir, gerçek Medusa/DB gerekmez
 *   - SectorRegistry import yapıldığında 4 sektör otomatik yüklenir
 *   - SectorRulesService statik metod olduğu için DI gerektirmez
 */

import {
    SectorRegistry,
    SectorRulesService,
    SECTOR_CODES,
} from "../sector-framework"

describe("SectorRegistry", () => {
    it("4 varsayılan sektörü kayıt eder (retail, horeca, b2b, fashion)", () => {
        expect(SectorRegistry.listCodes().sort()).toEqual(
            ["retail", "horeca", "b2b", "fashion"].sort()
        )
    })

    it("SECTOR_CODES sabit dizisi registry ile birebir aynı", () => {
        expect([...SECTOR_CODES].sort()).toEqual(SectorRegistry.listCodes().sort())
    })

    it("get() case-insensitive çalışır", () => {
        const a = SectorRegistry.get("retail")
        const b = SectorRegistry.get("RETAIL")
        const c = SectorRegistry.get("Retail")
        expect(a.code).toBe("retail")
        expect(b.code).toBe("retail")
        expect(c.code).toBe("retail")
    })

    it("bilinmeyen sektör için anlamlı hata atar", () => {
        expect(() => SectorRegistry.get("uzay")).toThrow(/uzay.*kayıtlı değil/)
    })

    it("isSupported() exception atmaz", () => {
        expect(SectorRegistry.isSupported("b2b")).toBe(true)
        expect(SectorRegistry.isSupported("UZAY")).toBe(false)
    })

    it("list() tüm konfigürasyonları döndürür", () => {
        const all = SectorRegistry.list()
        expect(all).toHaveLength(4)
        expect(all.every((c) => typeof c.displayName === "string")).toBe(true)
        expect(all.every((c) => typeof c.rules === "object")).toBe(true)
    })
})

describe("SectorRulesService.validateCartItem — RETAIL", () => {
    it("normal alışveriş geçer", () => {
        const r = SectorRulesService.validateCartItem({
            sector: "retail",
            quantity: 2,
            availableStock: 10,
        })
        expect(r.valid).toBe(true)
    })

    it("B2B-only ürünü retail mağazasında satılamaz", () => {
        const r = SectorRulesService.validateCartItem({
            sector: "retail",
            quantity: 1,
            isB2BOnly: true,
            availableStock: 99,
        })
        expect(r.valid).toBe(false)
        expect(r.violation).toBe("PRODUCT_NOT_AVAILABLE_IN_SECTOR")
        expect(r.honestyNote).toBeDefined()
    })

    it("stok yetersizliğinde dürüst mesaj döner", () => {
        const r = SectorRulesService.validateCartItem({
            sector: "retail",
            quantity: 5,
            availableStock: 2,
        })
        expect(r.valid).toBe(false)
        expect(r.violation).toBe("INSUFFICIENT_PHYSICAL_STOCK")
        expect(r.message).toContain("2")
        expect(r.message).toContain("5")
    })
})

describe("SectorRulesService.validateCartItem — HORECA", () => {
    it("teslimat tarihi olmadan reddedilir", () => {
        const r = SectorRulesService.validateCartItem({
            sector: "horeca",
            quantity: 1,
        })
        expect(r.valid).toBe(false)
        expect(r.violation).toBe("MISSING_DELIVERY_DATE")
    })

    it("teslimat tarihi verilirse geçer (stok zorunlu değil)", () => {
        const r = SectorRulesService.validateCartItem({
            sector: "horeca",
            quantity: 1,
            requestedDate: "2026-06-15T19:00:00Z",
        })
        expect(r.valid).toBe(true)
    })

    it("stok 0 olsa bile backorder mümkün (mutfak hazırlar)", () => {
        const r = SectorRulesService.validateCartItem({
            sector: "horeca",
            quantity: 1,
            requestedDate: new Date(),
            availableStock: 0,
        })
        expect(r.valid).toBe(true)
    })
})

describe("SectorRulesService.validateCartItem — B2B (MOQ)", () => {
    it("sektör defaultu (10) altında ürün/tenant override yoksa reddedilir", () => {
        const r = SectorRulesService.validateCartItem({
            sector: "b2b",
            quantity: 5,
            availableStock: 100,
        })
        expect(r.valid).toBe(false)
        expect(r.violation).toBe("MOQ_NOT_MET")
        expect(r.message).toContain("10")
    })

    it("ürün metadata MOQ override eder", () => {
        const r = SectorRulesService.validateCartItem({
            sector: "b2b",
            quantity: 15,
            productMoq: 20,
            availableStock: 100,
        })
        expect(r.valid).toBe(false)
        expect(r.message).toContain("20")
    })

    it("tenant default MOQ ürün override yokken devreye girer", () => {
        const r = SectorRulesService.validateCartItem({
            sector: "b2b",
            quantity: 20,
            tenantDefaultMoq: 25,
            availableStock: 100,
        })
        expect(r.valid).toBe(false)
        expect(r.message).toContain("25")
    })

    it("öncelik: product > tenant > sektör (ürün geçerse her şey geçer)", () => {
        const r = SectorRulesService.validateCartItem({
            sector: "b2b",
            quantity: 5,
            productMoq: 5,
            tenantDefaultMoq: 25,
            availableStock: 100,
        })
        expect(r.valid).toBe(true)
    })
})

describe("SectorRulesService.shouldShowInCatalog", () => {
    it("normal ürün her sektörde gösterilir", () => {
        expect(SectorRulesService.shouldShowInCatalog("retail", false)).toBe(true)
        expect(SectorRulesService.shouldShowInCatalog("b2b", false)).toBe(true)
        expect(SectorRulesService.shouldShowInCatalog("fashion", false)).toBe(true)
    })

    it("B2B-only ürün sadece B2B'de gösterilir", () => {
        expect(SectorRulesService.shouldShowInCatalog("retail", true)).toBe(false)
        expect(SectorRulesService.shouldShowInCatalog("b2b", true)).toBe(true)
        expect(SectorRulesService.shouldShowInCatalog("fashion", true)).toBe(false)
    })

    it("bilinmeyen sektörde her şey gizlenir (güvenli varsayılan)", () => {
        expect(SectorRulesService.shouldShowInCatalog("uzay", false)).toBe(false)
    })
})
