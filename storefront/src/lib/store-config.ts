/**
 * StoreConfig — backend `src/modules/tenant/store-config.ts` ile AYNI sözleşme
 * (email.* hariç: o alanlar backend-only, public endpoint dönmez).
 *
 * Kaynak: /store/tenants/me → tenant.storefront
 *
 * ÇÖZÜMLEME SIRASI (tüm bileşenler aynı kuralı uygular):
 *   1. config.<alan>          → mağazaya özel değer
 *   2. sektör preset'i        → themes.ts metin preset'leri
 *   3. NÖTR varsayılan        → "Mağaza", boş string, host'tan URL
 *
 * Başka mağazanın değeri ASLA fallback olamaz; `sector === "vape"` gibi
 * koşullarla içerik seçmek yasaktır (sektör yalnızca preset seçer).
 */

export type StoreConfigLink = { label: string; href: string }

export type StoreConfig = {
    branding?: {
        description?: string
        logoUrl?: string
        keywords?: string[]
    }
    contact?: {
        person?: string
        phone?: string
        email?: string
        address?: string
    }
    seo?: {
        titleSuffix?: string
    }
    ai?: {
        greeting?: string
        chatEnabled?: boolean
        whatsappLink?: string | null
    }
    ageGate?: {
        enabled?: boolean
        message?: string
    }
    commerce?: {
        regionName?: string
        locale?: string
        carriers?: string[]
    }
    footer?: {
        categoryLinks?: StoreConfigLink[]
    }
    // ─── Mevcut Vitrin Ayarları alanları ───
    heroImage?: string
    socials?: { instagram?: string; facebook?: string; x?: string; youtube?: string }
    links?: { kurumsal?: string; musteri?: string; yasal?: string }
}

/** Tenant yüklenemediğinde kullanılacak nötr marka adı (hiçbir mağazaya ait değil). */
export const NEUTRAL_BRAND = "Mağaza"
