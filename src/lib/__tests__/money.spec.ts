/**
 * money.ts — BigNumber-Safe Para Yardımcıları Testleri
 *
 * Bu testler, AGENTS.md'nin "BigNumber zorunlu" finansal matematik
 * kuralını ihlal etmediğimizi ve null/undefined gibi defansif kabuller
 * yaptığımızı doğrular.
 */

import { BigNumber } from "@medusajs/framework/utils"
import {
    toBig,
    toNumber,
    minorToMajorFloor,
    roundToMinor,
    isValidAmount,
} from "../money"

describe("toBig — MoneyInput → BigNumber", () => {
    it("number'ı BigNumber'a çevirir", () => {
        expect(toBig(1234).numeric).toBe(1234)
    })

    it("string sayıyı BigNumber'a çevirir", () => {
        expect(toBig("1234.56").numeric).toBeCloseTo(1234.56)
    })

    it("null/undefined girişler 0 BigNumber döner (defansif)", () => {
        expect(toBig(null).numeric).toBe(0)
        expect(toBig(undefined).numeric).toBe(0)
    })

    it("BigNumber instance'ını aynen döndürür (identity)", () => {
        const bn = new BigNumber(99)
        expect(toBig(bn)).toBe(bn)
    })

    it("BigNumberRawValue { value } formatını çözer", () => {
        expect(toBig({ value: "500" }).numeric).toBe(500)
        expect(toBig({ value: 750 }).numeric).toBe(750)
    })

    it("bigint girişini parse eder", () => {
        expect(toBig(12345n).numeric).toBe(12345)
    })
})

describe("toNumber — güvenli sayı dönüşümü", () => {
    it("normal değerleri döker", () => {
        expect(toNumber(42)).toBe(42)
        expect(toNumber("99.5")).toBeCloseTo(99.5)
    })

    it("null/undefined için 0 döner", () => {
        expect(toNumber(null)).toBe(0)
        expect(toNumber(undefined)).toBe(0)
    })

    it("BigNumber raw value formatından çözer", () => {
        expect(toNumber({ value: "12345" })).toBe(12345)
    })
})

describe("minorToMajorFloor — kuruş → TL (puan hesabı için)", () => {
    it("tam TL sayısını döndürür (kuruşu atar)", () => {
        expect(minorToMajorFloor(15075)).toBe(150) // 150.75 TL
        expect(minorToMajorFloor(9999)).toBe(99) // 99.99 TL
        expect(minorToMajorFloor(10000)).toBe(100) // 100.00 TL
    })

    it("0 ve null güvenli şekilde 0 döner", () => {
        expect(minorToMajorFloor(0)).toBe(0)
        expect(minorToMajorFloor(null)).toBe(0)
        expect(minorToMajorFloor(undefined)).toBe(0)
    })

    it("BigNumber girişini doğru işler", () => {
        const bn = new BigNumber(5000) // 50.00 TL kuruş cinsinden
        expect(minorToMajorFloor(bn)).toBe(50)
    })

    it("Medusa raw value formatından çalışır", () => {
        expect(minorToMajorFloor({ value: "123456" })).toBe(1234) // 1234.56 TL
    })

    it("özel divisor (örn. 1000 = milli) destekler", () => {
        expect(minorToMajorFloor(15000, 1000)).toBe(15)
    })

    it("divisor 0 veya negatifse hata atar", () => {
        expect(() => minorToMajorFloor(100, 0)).toThrow(/divisor/)
        expect(() => minorToMajorFloor(100, -10)).toThrow(/divisor/)
    })
})

describe("roundToMinor — ödeme gateway için integer kuruş", () => {
    it("tam sayıyı korur", () => {
        expect(roundToMinor(15075)).toBe(15075)
    })

    it("string sayıları yuvarlar", () => {
        expect(roundToMinor("1234.5")).toBe(1235)
        expect(roundToMinor("1234.4")).toBe(1234)
    })

    it("null için 0 döner (defansif; çağıran isValidAmount ile kontrol etmeli)", () => {
        expect(roundToMinor(null)).toBe(0)
    })

    it("BigNumber girişini yuvarlar", () => {
        expect(roundToMinor(new BigNumber("99.7"))).toBe(100)
    })
})

describe("isValidAmount — pozitif sonlu sayı kontrolü", () => {
    it("pozitif sayılar geçer", () => {
        expect(isValidAmount(1)).toBe(true)
        expect(isValidAmount("100")).toBe(true)
        expect(isValidAmount(new BigNumber(50))).toBe(true)
    })

    it("0, negatif, null, undefined reddedilir", () => {
        expect(isValidAmount(0)).toBe(false)
        expect(isValidAmount(-1)).toBe(false)
        expect(isValidAmount(null)).toBe(false)
        expect(isValidAmount(undefined)).toBe(false)
    })

    it("Infinity ve NaN reddedilir", () => {
        expect(isValidAmount(Infinity)).toBe(false)
        expect(isValidAmount("not-a-number")).toBe(false)
    })
})
