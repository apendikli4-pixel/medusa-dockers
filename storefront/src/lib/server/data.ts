/**
 * Server-side Medusa data fetching helpers.
 * Tüm /store/* çağrıları sunucu tarafında, publishable key + region scope ile.
 */
import "server-only"
import { unstable_cache } from "next/cache"
import { sdk } from "../medusa-client"

const DEFAULT_REGION_NAME = process.env.NEXT_PUBLIC_DEFAULT_REGION_NAME || "Miror-Core"

export type StoreProduct = {
    id: string
    title: string
    handle: string
    description: string | null
    thumbnail: string | null
    variants: Array<{
        id: string
        title: string
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

/**
 * Aktif region'u getirir (default: env tabanlı, yoksa ilk region).
 */
export const getDefaultRegion = unstable_cache(
    async (): Promise<StoreRegion | null> => {
        try {
            const { regions } = await sdk.store.region.list({ fields: "id,name,currency_code,countries.iso_2,countries.name" })
            if (!regions?.length) return null
            const match = regions.find(
                (r: { name?: string }) => r.name === DEFAULT_REGION_NAME
            )
            return (match || regions[0]) as StoreRegion
        } catch (err) {
            console.error("[getDefaultRegion]", err)
            return null
        }
    },
    ["medusa-default-region"],
    { revalidate: 60, tags: ["regions"] }
)

/**
 * Ürün listesi — region'a göre fiyatlandırılmış.
 * Opsiyonel filtreler:
 *   q: full-text arama
 *   categoryId: tek kategori
 *   categoryHandle: handle ile filtre (önce id'ye dönüştürülür)
 */
export const listProducts = unstable_cache(
    async (opts: {
        limit?: number
        q?: string
        categoryId?: string
        categoryHandle?: string
    } = {}): Promise<StoreProduct[]> => {
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

            const { products } = await sdk.store.product.list(query)
            return (products as unknown) as StoreProduct[]
        } catch (err) {
            console.error("[listProducts]", err)
            return []
        }
    },
    ["medusa-list-products"],
    { revalidate: 60, tags: ["products"] }
)

export type StoreCategory = {
    id: string
    name: string
    handle: string
}

/**
 * Tüm kategoriler — sidebar/dropdown için.
 */
export const listCategories = unstable_cache(
    async (): Promise<StoreCategory[]> => {
        try {
            const { product_categories } = await sdk.store.category.list({
                fields: "id,name,handle",
                limit: 50,
            })
            return (product_categories as unknown) as StoreCategory[]
        } catch (err) {
            console.error("[listCategories]", err)
            return []
        }
    },
    ["medusa-list-categories"],
    { revalidate: 60, tags: ["categories"] }
)

/**
 * Tek kategori (handle ile).
 */
export const getCategoryByHandle = unstable_cache(
    async (handle: string): Promise<StoreCategory | null> => {
        try {
            const { product_categories } = await sdk.store.category.list({
                handle,
                limit: 1,
                fields: "id,name,handle",
            })
            return ((product_categories?.[0] as unknown) as StoreCategory) || null
        } catch (err) {
            console.error("[getCategoryByHandle]", err)
            return null
        }
    },
    ["medusa-get-category"],
    { revalidate: 60, tags: ["categories"] }
)

/**
 * Tek ürün (handle ile).
 */
export async function getProductByHandle(handle: string): Promise<StoreProduct | null> {
    const region = await getDefaultRegion()
    if (!region) return null
    try {
        const { products } = await sdk.store.product.list({
            handle,
            region_id: region.id,
            limit: 1,
            fields: "id,title,handle,description,thumbnail,*variants,*variants.calculated_price",
        })
        return (products?.[0] as unknown as StoreProduct) || null
    } catch (err) {
        console.error("[getProductByHandle]", err)
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
        const { products } = await sdk.store.product.list({
            id: ids,
            region_id: region.id,
            limit: ids.length,
            fields: "id,title,handle,description,thumbnail,*variants,*variants.calculated_price",
        })
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
