/**
 * Server-side Medusa data fetching helpers.
 * Tüm /store/* çağrıları sunucu tarafında, publishable key + region scope ile.
 */
import "server-only"
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
export async function getDefaultRegion(): Promise<StoreRegion | null> {
    try {
        const { regions } = await sdk.store.region.list({ fields: "id,name,currency_code,countries.iso_2,countries.name" })
        if (!regions?.length) return null
        const match = regions.find((r) => r.name === DEFAULT_REGION_NAME)
        return (match || regions[0]) as StoreRegion
    } catch (err) {
        console.error("[getDefaultRegion]", err)
        return null
    }
}

/**
 * Ürün listesi — region'a göre fiyatlandırılmış.
 */
export async function listProducts(limit = 24): Promise<StoreProduct[]> {
    const region = await getDefaultRegion()
    if (!region) return []
    try {
        const { products } = await sdk.store.product.list({
            region_id: region.id,
            limit,
            fields: "id,title,handle,description,thumbnail,*variants.calculated_price",
        })
        return (products as unknown) as StoreProduct[]
    } catch (err) {
        console.error("[listProducts]", err)
        return []
    }
}

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
