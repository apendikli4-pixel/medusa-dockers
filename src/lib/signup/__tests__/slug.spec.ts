import { slugify, isValidSlug } from "../slug"

describe("slugify", () => {
    it("boşlukları tire yapar, küçük harfe çevirir", () => {
        expect(slugify("Aqua Havuz Market")).toBe("aqua-havuz-market")
    })
    it("Türkçe karakterleri ASCII'ye indirger", () => {
        expect(slugify("Çağrı Şöför Üçgen İğne")).toBe("cagri-sofor-ucgen-igne")
    })
    it("alfanümerik olmayanları temizler, çoklu tireyi sadeleştirir", () => {
        expect(slugify("  Vozol!!  &  Pod___Shop  ")).toBe("vozol-pod-shop")
    })
    it("baştaki/sondaki tireleri kırpar", () => {
        expect(slugify("--Mağaza--")).toBe("magaza")
    })
    it("rakamları korur", () => {
        expect(slugify("5L Havuz 2026")).toBe("5l-havuz-2026")
    })
    it("tamamen geçersiz girdi boş string döner (çağıran reddetmeli)", () => {
        expect(slugify("!!! ??? ...")).toBe("")
        expect(slugify("")).toBe("")
    })
    it("üretilen slug tenant slug kuralına uyar", () => {
        expect(isValidSlug(slugify("Aqua Havuz Market"))).toBe(true)
        expect(isValidSlug(slugify("Çağrı'nın Mağazası"))).toBe(true)
    })
})

describe("isValidSlug", () => {
    it("geçerli slug'ları kabul eder", () => {
        expect(isValidSlug("aqua-havuz")).toBe(true)
        expect(isValidSlug("vozol2026")).toBe(true)
    })
    it("geçersizleri reddeder", () => {
        expect(isValidSlug("Aqua Havuz")).toBe(false) // boşluk
        expect(isValidSlug("-baslangic")).toBe(false) // baş tire
        expect(isValidSlug("son-")).toBe(false)        // son tire
        expect(isValidSlug("ÇİFT")).toBe(false)        // büyük/Türkçe
        expect(isValidSlug("")).toBe(false)
    })
})
