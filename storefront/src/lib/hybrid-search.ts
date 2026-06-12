/**
 * hybrid-search.ts
 * 
 * Server-side Meilisearch integration for Next.js Storefront.
 * Performs fast, typo-tolerant searches over the product catalog.
 */

// We use native fetch to avoid adding the 'meilisearch' npm dependency on the storefront,
// keeping the bundle small. This must only be run on the server.

const MEILI_HOST = process.env.MEILISEARCH_HOST || "http://localhost:7700"
// It's safe to use the search key or master key here as this file runs SERVER SIDE only.
const MEILI_KEY = process.env.MEILISEARCH_SEARCH_KEY || process.env.MEILISEARCH_MASTER_KEY || "masterKey123"

export interface SearchProductResult {
    id: string
    title: string
    description?: string
    handle: string
    status: string
    thumbnail?: string
    categories?: string[]
    tags?: string[]
    collection?: string
    type?: string
    sales_channel_ids?: string[]
    variants?: any[]
}

export interface SearchOptions {
    limit?: number
    offset?: number
    salesChannelId?: string
}

export async function searchProducts(query: string, options: SearchOptions = {}): Promise<{ hits: SearchProductResult[], estimatedTotalHits: number, processingTimeMs: number }> {
    try {
        const limit = options.limit || 20
        const offset = options.offset || 0

        // Eşleşen ürünleri bul (typo-tolerant)
        const body: any = {
            q: query,
            limit,
            offset,
        }

        // Eğer salesChannelId verilmişse filter ekleyelim
        // Meilisearch'de filtre yapabilmek için o alanın "filterableAttributes" içinde tanımlı olması gerekir.
        // product-sync.ts tarafından sales_channel_ids indekse gönderiliyor.
        if (options.salesChannelId) {
            body.filter = [`sales_channel_ids = '${options.salesChannelId}'`]
        }

        const res = await fetch(`${MEILI_HOST}/indexes/products/search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${MEILI_KEY}`
            },
            body: JSON.stringify(body),
            // cache: "no-store" // Eğer arama sonuçları anlık değişsin isteniyorsa
            next: { revalidate: 60 } // Next.js 15 cache mantığı (kısmi önbellekleme)
        })

        if (!res.ok) {
            console.error(`[Meilisearch] HTTP ${res.status}: ${await res.text()}`)
            return { hits: [], estimatedTotalHits: 0, processingTimeMs: 0 }
        }

        const data = await res.json()
        return {
            hits: data.hits || [],
            estimatedTotalHits: data.estimatedTotalHits || 0,
            processingTimeMs: data.processingTimeMs || 0
        }
    } catch (error: any) {
        console.error("[Meilisearch] Search Error:", error.message)
        return { hits: [], estimatedTotalHits: 0, processingTimeMs: 0 }
    }
}
