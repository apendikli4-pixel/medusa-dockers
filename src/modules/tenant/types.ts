/**
 * Tenant Modülü — Tip Tanımları ve DTO'lar
 *
 * Bu dosya, Tenant modülünün tüm TypeScript tip tanımlarını içerir.
 * Zod validasyonu API katmanında yapılır; buradaki tipler
 * servis katmanı içindir.
 *
 * Dürüstlük ilkesi: Her tip açıkça belgelenmiştir,
 * hangi alanın zorunlu, hangisinin opsiyonel olduğu net olarak belirtilmiştir.
 */

import { VALID_SECTORS, VALID_FEATURES } from "./service"

// ─── TEMEL TİPLER ───

/**
 * Geçerli sektör değerleri.
 * - retail: Perakende satış (fiziksel/online mağaza)
 * - horeca: Otel, restoran, kafe (toplu tüketim)
 * - b2b: İşletmeler arası toptan satış
 * - fashion: Moda ve giyim sektörü
 */
export type TenantSector = typeof VALID_SECTORS[number]

/**
 * Mağazada aktifleştirilebilecek özellikler.
 * Her özellik bağımsız bir modüle karşılık gelir.
 */
export type TenantFeature = typeof VALID_FEATURES[number]

/**
 * Mağaza ayarları JSON yapısı.
 * settings JSONB kolonunda saklanır.
 */
export interface TenantSettings {
    /** Tema ayarları — renk, logo vb. */
    theme?: {
        primaryColor?: string
        secondaryColor?: string
        logo?: string
    }
    /** Tercih edilen dil kodu, örn: "tr-TR" */
    locale?: string
    /** Varsayılan para birimi kodu, örn: "TRY" */
    currency?: string
    /** KDV oranı (yüzde), örn: 20 */
    tax_rate?: number
    /** İletişim bilgileri */
    contact?: {
        phone?: string
        email?: string
        address?: string
    }
    /** Serbest formatta ek ayarlar */
    [key: string]: unknown
}

// ─── DTO'LAR ───

/**
 * CreateTenantDTO — Yeni mağaza oluşturmak için gerekli veriler.
 *
 * Zorunlu alanlar: name, slug, sector
 * Opsiyonel alanlar: settings, features, owner_id, domain, metadata
 *
 * Dürüstlük ilkesi: Slug benzersiz olmalı, sektör geçerli bir değer olmalı.
 * Bu kontroller servis katmanında çift kez doğrulanır
 * (API'de Zod + serviste iş mantığı).
 */
export interface CreateTenantDTO {
    /** Mağaza adı — kullanıcıya gösterilecek resmi isim (ZORUNLU) */
    name: string
    /** Benzersiz URL slug'ı — subdomain veya route için kullanılır (ZORUNLU) */
    slug: string
    /** Faaliyet sektörü — iş kurallarını belirler (ZORUNLU) */
    sector: TenantSector
    /** Mağazaya özel JSON ayarları (OPSİYONEL) */
    settings?: TenantSettings | null
    /** Aktifleştirilecek özellik listesi (OPSİYONEL, varsayılan: boş dizi) */
    features?: TenantFeature[]
    /** Mağaza sahibi admin kullanıcı ID'si (OPSİYONEL) */
    owner_id?: string | null
    /** Özel alan adı (OPSİYONEL) */
    domain?: string | null
    /** Ek veriler (OPSİYONEL) */
    metadata?: Record<string, unknown> | null
}

/**
 * UpdateTenantDTO — Mağaza güncellemek için kullanılır.
 *
 * Tüm alanlar opsiyoneldir. Sadece gönderilen alanlar güncellenir.
 * Gönderilmeyen alanlar mevcut değerlerini korur.
 */
export interface UpdateTenantDTO {
    /** Mağaza adı */
    name?: string
    /** URL slug'ı — değiştirilirse benzersizlik tekrar kontrol edilir */
    slug?: string
    /** Faaliyet sektörü */
    sector?: TenantSector
    /** Mağaza ayarları — mevcut ayarlarla birleştirilir (merge) */
    settings?: TenantSettings | null
    /** Aktif özellik listesi — tamamen üzerine yazılır (replace, merge değil) */
    features?: TenantFeature[]
    /** Aktiflik durumu */
    is_active?: boolean
    /** Mağaza sahibi */
    owner_id?: string | null
    /** Özel alan adı */
    domain?: string | null
    /** Ek veriler */
    metadata?: Record<string, unknown> | null
}

/**
 * TenantListFilters — Mağaza listeleme filtreleri.
 * Tüm filtreler opsiyoneldir, birlikte kullanıldığında AND mantığıyla çalışır.
 */
export interface TenantListFilters {
    /** Sektöre göre filtrele */
    sector?: TenantSector
    /** Aktiflik durumuna göre filtrele */
    is_active?: boolean
    /** Sahibine göre filtrele */
    owner_id?: string
    /** İsme göre arama (contains) */
    name?: string
}

/**
 * TenantOperationResult — Servis işlem sonucu.
 * Dürüstlük ilkesi: Her işlemin başarı durumu ve sebebi açıkça belirtilir.
 */
export interface TenantOperationResult<T = unknown> {
    /** İşlem başarılı mı? */
    success: boolean
    /** Sonuç verisi — başarılıysa tenant objesi, başarısızsa null */
    data: T | null
    /** İşlem açıklaması — başarılıysa yapılan işlem, başarısızsa hata sebebi */
    message: string
    /** İşlem zaman damgası */
    timestamp: Date
}
