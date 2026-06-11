/**
 * Server-side Medusa data fetching helpers.
 * Tüm /store/* çağrıları sunucu tarafında.
 *
 * ÇOKLU MAĞAZA: Ürün/kategori çağrıları AKTİF TENANT'ın publishable key'i ile
 * yapılır (her mağaza yalnızca kendi sales-channel ürünlerini görür). Bu yüzden
 * bu çağrılar unstable_cache ile (tenant'tan bağımsız) ÖNBELLEKLENMEZ — aksi halde
 * bir mağazanın ürünleri diğerine sızabilirdi. Region global olduğundan cache'lenir.
 */
import "server-only"
import { unstable_cache } from "next/cache"
import { sdk } from "../medusa-client"
import { retrieveCurrentTenant } from "./tenant"

const DEFAULT_REGION_NAME = process.env.NEXT_PUBLIC_DEFAULT_REGION_NAME || "Miror-Core"

// Özel backend endpoint'leri (SDK'da karşılığı olmayanlar) için doğrudan fetch.
const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const FALLBACK_PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
    process.env.MEDUSA_PUBLISHABLE_KEY ||
    ""

export type StoreProduct = {
    id: string
    title: string
    handle: string
    description: string | null
    thumbnail: string | null
    variants: Array<{
        id: string
        title: string
        sku?: string | null
        calculated_price?: {
            calculated_amount: number
            currency_code: string
        }
    }>
}

export type StoreRegion = {
    id: string
    name: string
    currency_code: string
    countries: Array<{ iso_2: string; name: string }>
}

export type StoreCategory = {
    id: string
    name: string
    handle: string
}

export type ProductReviewStats = {
    count: number
    average: number
}

/**
 * Aktif tenant'ın publishable key + slug header'ları.
 * Storefront böylece doğru mağazanın (sales-channel) ürünlerini çeker.
 * Tenant pk yoksa boş döner → SDK kendi env key'ini (default mağaza) kullanır.
 *
 * EXPORT: cart.ts / checkout.ts / actions da aynı header'ları kullanmak ZORUNDA —
 * aksi halde sepet yanlış mağazanın sales-channel'ına bağlanır (çapraz sızıntı).
 */
export async function tenantHeaders(): Promise<Record<string, string>> {
    try {
        const t = await retrieveCurrentTenant()
        const h: Record<string, string> = {}
        if (t?.publishableKey) h["x-publishable-api-key"] = t.publishableKey
        if (t?.slug) h["x-tenant-slug"] = t.slug
        return h
    } catch {
        return {}
    }
}

/**
 * İsme göre region getirir (isim boş/bulunamazsa ilk region).
 * unstable_cache anahtarına argüman dahildir → her region adı ayrı cache girdisi
 * (mağazalar birbirinin region'ını ezemez).
 */
const getRegionByName = unstable_cache(
    async (regionName: string): Promise<StoreRegion | null> => {
        try {
            const { regions } = await sdk.store.region.list({ fields: "id,name,currency_code,countries.iso_2,countries.name" })
            if (!regions?.length) return null
            const match = regionName
                ? regions.find((r: { name?: string }) => r.name === regionName)
                : undefined
            return (match || regions[0]) as StoreRegion
        } catch (err) {
            console.error("[getRegionByName]", err)
            return null
        }
    },
    ["medusa-region-by-name"],
    { revalidate: 60, tags: ["regions"] }
)

/**
 * AKTİF MAĞAZANIN region'ını getirir.
 * Çözümleme: tenant config (commerce.regionName) → env varsayılanı → ilk region.
 * Böylece N mağaza farklı para birimi/region kullanabilir; config'i olmayan
 * mağaza bugünkü davranışı (env region) korur.
 */
export async function getDefaultRegion(): Promise<StoreRegion | null> {
    let configRegion = ""
    try {
        const tenant = await retrieveCurrentTenant()
        configRegion = tenant?.storefront?.commerce?.regionName || ""
    } catch { /* tenant çözülemezse env'e düş */ }
    return getRegionByName(configRegion || DEFAULT_REGION_NAME)
}

/**
 * Ürün listesi — aktif tenant'ın sales-channel'ına göre kapsamlı.
 */
export async function listProducts(opts: {
    limit?: number
    q?: string
    categoryId?: string
    categoryHandle?: string
} = {}): Promise<StoreProduct[]> {
    const region = await getDefaultRegion()
    if (!region) return []

    let categoryId = opts.categoryId
    if (!categoryId && opts.categoryHandle) {
        const cat = await getCategoryByHandle(opts.categoryHandle)
        categoryId = cat?.id
    }

    try {
        const query: Record<string, unknown> = {
            region_id: region.id,
            limit: opts.limit ?? 24,
            fields: "id,title,handle,description,thumbnail,*variants.calculated_price",
        }
        if (opts.q && opts.q.trim()) query.q = opts.q.trim()
        if (categoryId) query.category_id = [categoryId]

        const { products } = await sdk.store.product.list(query, await tenantHeaders())
        return (products as unknown) as StoreProduct[]
    } catch (err) {
        console.error("[listProducts]", err)
        return []
    }
}

/**
 * Kategoriler — AKTİF tenant'ın ürünlerinden türetilir.
 * Neden: /store/product-categories sales-channel'a göre filtrelenmez (global), bu yüzden
 * başka mağazanın kategorisi (ör. havuz sitesinde "Kullan-At Elektronik Sigara") sızardı.
 * Ürünler publishable key ile zaten kapsamlı olduğundan, ürünlerin kategorilerini toplamak
 * sızıntıyı tamamen önler (boş kategoriler de gösterilmez — istenen davranış).
 */
export async function listCategories(): Promise<StoreCategory[]> {
    try {
        const { products } = await sdk.store.product.list(
            { limit: 200, fields: "id,categories.id,categories.name,categories.handle" },
            await tenantHeaders()
        )
        const map = new Map<string, StoreCategory>()
        for (const p of ((products as any[]) || [])) {
            for (const c of (p?.categories || [])) {
                if (c?.id && !map.has(c.id)) {
                    map.set(c.id, { id: c.id, name: c.name, handle: c.handle })
                }
            }
        }
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "tr"))
    } catch (err) {
        console.error("[listCategories]", err)
        return []
    }
}

/**
 * Tek kategori (handle ile).
 */
export async function getCategoryByHandle(handle: string): Promise<StoreCategory | null> {
    try {
        const { product_categories } = await sdk.store.category.list(
            { handle, limit: 1, fields: "id,name,handle" },
            await tenantHeaders()
        )
        return ((product_categories?.[0] as unknown) as StoreCategory) || null
    } catch (err) {
        console.error("[getCategoryByHandle]", err)
        return null
    }
}

/**
 * Tek ürün (handle ile).
 */
export async function getProductByHandle(handle: string): Promise<StoreProduct | null> {
    const region = await getDefaultRegion()
    if (!region) return null
    try {
        const { products } = await sdk.store.product.list(
            {
                handle,
                region_id: region.id,
                limit: 1,
                fields: "id,title,handle,description,thumbnail,*variants,*variants.calculated_price",
            },
            await tenantHeaders()
        )
        return (products?.[0] as unknown as StoreProduct) || null
    } catch (err) {
        console.error("[getProductByHandle]", err)
        return null
    }
}

/**
 * Onaylı yorumlardan gerçek puan özeti (JSON-LD aggregateRating için).
 * Yorum yoksa null döner — sahte/yapay değer üretilmez (dürüstlük ilkesi +
 * Google yapılandırılmış veri politikası: rating yalnızca gerçek veriden gelebilir).
 * Yorumlar ürüne bağlı (product ID global benzersiz) olduğundan URL-bazlı
 * fetch cache'i tenant'lar arası sızıntı yaratmaz.
 */
export async function getProductReviewStats(productId: string): Promise<ProductReviewStats | null> {
    if (!productId) return null
    try {
        const headers = await tenantHeaders()
        if (!headers["x-publishable-api-key"] && FALLBACK_PUBLISHABLE_KEY) {
            headers["x-publishable-api-key"] = FALLBACK_PUBLISHABLE_KEY
        }
        const res = await fetch(`${BACKEND_URL}/store/products/${productId}/reviews`, {
            headers,
            next: { revalidate: 60 },
        })
        if (!res.ok) return null
        const data = await res.json()
        const ratings: number[] = (data?.reviews || [])
            .map((r: { rating?: unknown }) => Number(r?.rating))
            .filter((n: number) => Number.isFinite(n) && n >= 1 && n <= 5)
        if (ratings.length === 0) return null
        const average = ratings.reduce((sum, n) => sum + n, 0) / ratings.length
        return { count: ratings.length, average }
    } catch (err) {
        console.error("[getProductReviewStats]", err)
        return null
    }
}

/**
 * Birden fazla ürünü ID listesine göre getir.
 */
export async function getProductsByIds(ids: string[]): Promise<StoreProduct[]> {
    if (!ids || ids.length === 0) return []
    const region = await getDefaultRegion()
    if (!region) return []
    try {
        const { products } = await sdk.store.product.list(
            {
                id: ids,
                region_id: region.id,
                limit: ids.length,
                fields: "id,title,handle,description,thumbnail,*variants,*variants.calculated_price",
            },
            await tenantHeaders()
        )
        return (products as unknown) as StoreProduct[]
    } catch (err) {
        console.error("[getProductsByIds]", err)
        return []
    }
}

/**
 * Para birimini sembolize et.
 */
export function formatPrice(amount: number | undefined, currency: string = "EUR"): string {
    if (amount === undefined || amount === null) return "—"
    try {
        return new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency: currency.toUpperCase(),
            maximumFractionDigits: 2,
        }).format(amount)
    } catch {
        return `${amount} ${currency.toUpperCase()}`
    }
}
