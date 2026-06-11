/**
 * StoreConfig — Mağazaya özel TÜM sunum/operasyon değerlerinin tek doğruluk kaynağı.
 *
 * Nerede yaşar: tenant.settings.storefront (JSON kolonu — migration gerektirmez).
 * Vitrin Ayarları admin sayfası bu nesneyi düzenler.
 *
 * ÇÖZÜMLEME SIRASI (her tüketici aynı kuralı uygular):
 *   1. tenant.settings.storefront.<alan>   → mağazaya özel config
 *   2. sektör preset'i                     → storefront/src/lib/themes.ts metin preset'leri
 *   3. NÖTR global varsayılan              → "Mağaza", boş string, host'tan türetilen URL
 *
 * ASLA başka bir mağazanın değeri fallback olamaz (ör. vape mağazasında
 * havuz e-postası). `isVape` gibi sektör koşulları yasak; sektör yalnızca
 * preset SEÇİMİ için kullanılır.
 *
 * GÜVENLİK: `email.*` alanları (IBAN, gönderici) yalnızca backend içindir;
 * /store/tenants/me public endpoint'i bu alanları DÖNDÜRMEZ.
 */
import { z } from "@medusajs/framework/zod"

export const StoreConfigSchema = z.object({
    /** Marka kimliği — footer açıklaması, logo, SEO anahtar kelimeleri. */
    branding: z.object({
        description: z.string().optional(),
        logoUrl: z.string().optional(),
        keywords: z.array(z.string()).optional(),
    }).optional(),

    /** İletişim — footer + iletişim sayfası. (Mevcut Vitrin Ayarları alanı.) */
    contact: z.object({
        person: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
    }).optional(),

    /** SEO — başlık eki vb. (URL'ler config DEĞİL; request host'undan türetilir.) */
    seo: z.object({
        titleSuffix: z.string().optional(),
    }).optional(),

    /** AI — vitrin chat karşılaması + admin içerik üretim kimliği. */
    ai: z.object({
        greeting: z.string().optional(),
        contentPersona: z.string().optional(),
    }).optional(),

    /** 18+ yaş kapısı — sektör hardcode'u yerine config. */
    ageGate: z.object({
        enabled: z.boolean().optional(),
        message: z.string().optional(),
    }).optional(),

    /** E-posta — SADECE backend okur (public /tenants/me dönmez). */
    email: z.object({
        senderName: z.string().optional(),
        senderAddress: z.string().optional(),
        /** Havale/EFT talimatı. Yoksa müşteriye IBAN GÖNDERİLMEZ (placeholder yasak). */
        iban: z.string().optional(),
        templates: z.object({
            orderPlaced: z.string().optional(),
        }).optional(),
    }).optional(),

    /** Ticaret — mağazanın region'ı, locale'i, anlaşmalı kargo firmaları. */
    commerce: z.object({
        regionName: z.string().optional(),
        locale: z.string().optional(),
        carriers: z.array(z.string()).optional(),
    }).optional(),

    /** Footer kategori linkleri — boşsa vitrin ürün-türevli kategorileri kullanır. */
    footer: z.object({
        categoryLinks: z.array(z.object({
            label: z.string(),
            href: z.string(),
        })).optional(),
    }).optional(),

    // ─── Mevcut Vitrin Ayarları alanları (geriye uyumluluk) ───
    heroImage: z.string().optional(),
    socials: z.object({
        instagram: z.string().optional(),
        facebook: z.string().optional(),
        x: z.string().optional(),
        youtube: z.string().optional(),
    }).optional(),
    links: z.object({
        kurumsal: z.string().optional(),
        musteri: z.string().optional(),
        yasal: z.string().optional(),
    }).optional(),
})

export type StoreConfig = z.infer<typeof StoreConfigSchema>

/**
 * Tenant kaydından StoreConfig'i güvenle çıkarır.
 * Bilinmeyen anahtarlar sessizce atılır; bozuk veri boş config'e düşer
 * (fail-open: config hatası mağazayı çökertmez, nötr varsayılanlar devreye girer).
 */
export function getStoreConfig(tenant: { settings?: unknown } | null | undefined): StoreConfig {
    const raw = (tenant?.settings as Record<string, unknown> | undefined)?.storefront ?? {}
    const parsed = StoreConfigSchema.safeParse(raw)
    return parsed.success ? parsed.data : {}
}
