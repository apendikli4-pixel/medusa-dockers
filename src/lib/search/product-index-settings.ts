/**
 * Meilisearch 'products' indeks ayarları — TEK DOĞRULUK KAYNAĞI
 * ═════════════════════════════════════════════════════════════
 * Hem kurulum script'i (src/scripts/setup-meilisearch.ts) hem de Canlı Bütünlük
 * Denetçisi'nin onarıcısı (src/lib/integrity) buradan okur. Böylece "doğru indeks durumu"
 * tanımı asla iki yerde ayrışmaz; onarıcı tam olarak kurulumun garanti ettiği durumu geri yükler.
 *
 * sales_channel_ids ÇOK-MAĞAZA (tenant) İZOLASYONU için zorunludur: filtrelenebilir olmazsa
 * hybrid-search filtreyi uygulayamaz ve arama tüm mağazaların ürünlerini sızdırabilir.
 */
export const PRODUCT_INDEX = "products"

export const PRODUCT_FILTERABLE_ATTRIBUTES = [
    "sales_channel_ids",
    "categories",
    "tags",
    "type",
    "collection",
    "status",
] as const

export const PRODUCT_SEARCHABLE_ATTRIBUTES = [
    "title",
    "description",
    "handle",
    "categories",
    "tags",
] as const

export const PRODUCT_SORTABLE_ATTRIBUTES = ["created_at", "updated_at"] as const

/** İzolasyon için filtrelenebilir olması ZORUNLU olan alan (denetçi bunu kontrol eder). */
export const ISOLATION_FILTER_ATTRIBUTE = "sales_channel_ids"

export interface MeiliIndexLike {
    updateFilterableAttributes: (a: string[]) => Promise<unknown>
    updateSearchableAttributes: (a: string[]) => Promise<unknown>
    updateSortableAttributes: (a: string[]) => Promise<unknown>
}

/** İdempotent: 'products' indeksini bilinen-doğru ayarlara getirir (kurulum = onarım aynı durum). */
export async function applyProductIndexSettings(index: MeiliIndexLike): Promise<void> {
    await index.updateFilterableAttributes([...PRODUCT_FILTERABLE_ATTRIBUTES])
    await index.updateSearchableAttributes([...PRODUCT_SEARCHABLE_ATTRIBUTES])
    await index.updateSortableAttributes([...PRODUCT_SORTABLE_ATTRIBUTES])
}
