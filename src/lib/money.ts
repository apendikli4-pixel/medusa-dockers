/**
 * money.ts — BigNumber-Safe Para Yardımcıları
 *
 * AGENTS.md kuralı: "Financial math — use Medusa's BigNumber utilities for
 * all price, tax, and stock arithmetic; never raw JS floats."
 *
 * Medusa V2'de para alanları (order.total, line_item.total, ...) BigNumber
 * objesi veya BigNumberRawValue (string/number/object) olarak gelir.
 * Bu dosya, bu değerleri güvenli bir şekilde yerli JS sayılarına çeviren
 * yardımcılar sunar — JS coercion'a (Number(bn) gibi) güvenmek yerine.
 *
 * Tasarım kararları:
 *   - Medusa'nın resmi BigNumber sınıfını (`@medusajs/framework/utils`)
 *     kullanır. Bağımlılık seçimi: BigNumber.js indirekt olarak Medusa
 *     içinde zaten var, ekstra paket eklenmiyor.
 *   - Tüm fonksiyonlar pure: side-effect yok, async değil.
 *   - null/undefined girişler hata atmaz; 0 döner. Order'ın total'i nadiren
 *     null olabilir (özellikle test fixture'larında) ve subscriber'da
 *     crash etmek istenmez.
 *
 * Tipler:
 *   - MoneyInput: Medusa'nın BigNumberInput'una benzer kabul edicidir.
 *     Number, string, bigint, BigNumber object veya raw value alır.
 */

import { BigNumber } from "@medusajs/framework/utils"
import type { BigNumberInput } from "@medusajs/framework/types"

/**
 * Para alanları için kabul edilen giriş tipi.
 *
 * Medusa entity'lerinden gelen total/subtotal/tax_total gibi alanlar
 * bunlardan biri olabilir:
 *   - number      → raw JS number (eski tip alanlar)
 *   - string      → "1234.56" formatında string (DB JSON serialization)
 *   - bigint      → ES2020 BigInt (büyük sayılar için)
 *   - BigNumber   → Medusa wrapper objesi
 *   - { value }   → BigNumberRawValue (Medusa internal format)
 *   - null/undef  → eksik veri (0 olarak ele alınır)
 */
export type MoneyInput =
    | number
    | string
    | bigint
    | BigNumber
    | BigNumberInput            // Medusa V2 entity money fields (order.total, vb.)
    | { value: string | number }
    | null
    | undefined

// ─── DÖNÜŞÜM YARDIMCILARI ──────────────────────────────────────────

/**
 * Bir MoneyInput'u Medusa BigNumber objesine çevirir.
 * null/undefined girişler için new BigNumber(0) döner.
 *
 * @example
 *   toBig(order.total)        // BigNumber
 *   toBig("1234.56")          // BigNumber 1234.56
 *   toBig(null)               // BigNumber 0
 */
export function toBig(input: MoneyInput): BigNumber {
    if (input === null || input === undefined) {
        return new BigNumber(0)
    }
    // Defensive: bazı test ortamlarında @medusajs/framework/utils mock'lanır
    // ve BigNumber undefined olabilir. `instanceof undefined` runtime hatası
    // yerine typeof guard ile güvenli kontrol.
    if (typeof BigNumber === "function" && input instanceof BigNumber) {
        return input
    }
    // BigNumberRawValue formatı: { value: "..." }
    if (typeof input === "object" && input !== null && "value" in input) {
        return new BigNumber((input as { value: string | number }).value)
    }
    if (typeof input === "bigint") {
        return new BigNumber(input.toString())
    }
    return new BigNumber(input as number | string)
}

/**
 * Bir MoneyInput'u güvenli bir JS number'a çevirir.
 *
 * UYARI: number tipi 2^53 üstü sayılarda presizyon kaybeder. Türk Lirası
 * kuruş cinsinden 9 katrilyon (9 * 10^15) kuruşa kadar (90 trilyon TL)
 * güvenlidir — ki bu pratik olarak hiçbir e-ticaret sisteminde aşılmaz.
 * Yine de presizyon kritik hesaplamalar için BigNumber API'sini doğrudan
 * kullanın (`toBig(x).times(...).integerValue()` gibi).
 */
export function toNumber(input: MoneyInput): number {
    const bn = toBig(input)
    const n = bn.numeric
    if (typeof n !== "number" || !Number.isFinite(n)) {
        return 0
    }
    return n
}

/**
 * Kuruş (minor unit) cinsinden bir tutarı, TL (major unit) cinsinden
 * integer'a çevirir — kuruş kısmı aşağı yuvarlanır (floor).
 *
 * Kullanım: loyalty puan hesabı, ekran/loglarda TL gösterimi.
 *
 * Örnek:
 *   minorToMajorFloor(150_75)  → 150   (150.75 TL → 150 TL'lik puan)
 *   minorToMajorFloor(99_99)   → 99    (99.99 TL → 99 TL'lik puan)
 *   minorToMajorFloor(0)       → 0
 *   minorToMajorFloor(null)    → 0     (defansif)
 *
 * NOT: Çoğu para birimi 100 minor unit kullanır (kuruş, cent). Eğer
 * farklı bir para birimi eklenirse (örn JPY = 1 minor unit), parametreli
 * `dividedBy(divisor)` versiyonunu kullanmak gerekir.
 */
export function minorToMajorFloor(minor: MoneyInput, divisor = 100): number {
    if (divisor <= 0) {
        throw new Error("[money.minorToMajorFloor] divisor pozitif olmalı")
    }
    const bn = toBig(minor)
    const major = bn.numeric / divisor
    return Math.floor(major)
}

/**
 * Bir para tutarını en yakın minor unit'e yuvarlar (round-half-up).
 *
 * Kullanım: ödeme gateway'lerine (PayTR, İyzico) tutar göndermek.
 * Bu sağlayıcılar genelde integer kuruş bekler.
 *
 * Örnek:
 *   roundToMinor(123.456)     → 123    (eğer zaten kuruş ise)
 *   roundToMinor("1234.5")    → 1235
 *   roundToMinor(null)        → 0      (defansif; çağıran genelde null
 *                                       gelmeden kontrol etmelidir)
 */
export function roundToMinor(amount: MoneyInput): number {
    const n = toNumber(amount)
    return Math.round(n)
}

/**
 * Bir MoneyInput'un pozitif, sonlu, makul bir sayı olup olmadığını söyler.
 * Ödeme akışlarında "geçersiz tutar" kontrolü için kullanılır.
 */
export function isValidAmount(amount: MoneyInput): boolean {
    if (amount === null || amount === undefined) return false
    const n = toNumber(amount)
    return Number.isFinite(n) && n > 0
}
