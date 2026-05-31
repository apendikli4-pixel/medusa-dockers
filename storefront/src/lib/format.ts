/**
 * Para birimi biçimlendirme — Medusa fiyatları minor unit (kuruş) tutar,
 * Intl.NumberFormat majör birim bekler. TR locale + dinamik currency.
 *
 * NOT: Medusa V2'de store API fiyatları zaten major unit (ondalıklı) döndürür
 * (ör. unit_price=1400 → 1400.00 TL DEĞİL; aslında 1400 = ₺1.400,00 için /1
 * mi /100 mü olduğu store ayarına bağlı). Bu projede DB'de price.amount
 * major unit olarak tutuluyor (1400 = 1400 TL). Dolayısıyla /100 YAPMIYORUZ.
 *
 * Eğer ileride kuruş bazlı tutar gelirse formatPriceCents kullanılmalı.
 */
export function formatPrice(amount: number, currencyCode: string): string {
    const code = (currencyCode || "TRY").toUpperCase()
    try {
        return new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency: code,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount)
    } catch {
        // Bilinmeyen currency kodu → sayı + kod
        return `${amount.toLocaleString("tr-TR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })} ${code}`
    }
}

/**
 * Kuruş/cent bazlı tutarı biçimlendir (minor unit → major unit).
 * Order/cart bazı alanları minor unit dönerse bunu kullan.
 */
export function formatPriceCents(cents: number, currencyCode: string): string {
    return formatPrice(cents / 100, currencyCode)
}
