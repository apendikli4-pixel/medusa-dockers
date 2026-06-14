/**
 * Self-Servis Kayıt — Slug Üretimi (saf, test edilir)
 * ════════════════════════════════════════════════════
 * Mağaza adından URL-güvenli, tenant slug kuralına uyan bir tanımlayıcı üretir.
 * Türkçe karakterler ASCII'ye indirgenir (ç→c, ş→s, ı/İ→i, ğ→g, ö→o, ü→u).
 * Diğer alfanümerik-olmayan karakterler tireye dönüşür.
 * Tenant slug kuralı (admin/tenants ile aynı): /^[a-z0-9]+(?:-[a-z0-9]+)*$/
 */

const TR_MAP: Record<string, string> = {
    "ç": "c", "Ç": "c",
    "ğ": "g", "Ğ": "g",
    "ı": "i", "İ": "i",
    "ö": "o", "Ö": "o",
    "ş": "s", "Ş": "s",
    "ü": "u", "Ü": "u",
}

export function slugify(input: string): string {
    return (input || "")
        .split("").map((ch) => TR_MAP[ch] ?? ch).join("")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") // alfanümerik olmayan → tire
        .replace(/-{2,}/g, "-")       // çoklu tireyi sadeleştir
        .replace(/^-+|-+$/g, "")      // baş/son tireyi kırp
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isValidSlug(slug: string): boolean {
    return typeof slug === "string" && SLUG_RE.test(slug)
}
