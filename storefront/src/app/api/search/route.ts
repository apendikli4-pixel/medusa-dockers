import { NextResponse } from "next/server"
import { searchProducts } from "@/lib/hybrid-search"
import { deriveTenantSlug } from "@/lib/tenant-slug"

/**
 * Proxy Route for Meilisearch
 * 
 * Güvenlik için, istemcinin (tarayıcı) doğrudan Meilisearch host ve key'ine
 * erişmesi engellenmiştir. Arama çubuğu bu /api/search rotasına istek atar.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get("q") || ""
        const limit = parseInt(searchParams.get("limit") || "20", 10)
        
        // Çoklu mağaza ortamında (tenant) sadece o mağazaya ait ürünleri
        // aramak için origin üzerinden tenant tespiti yap.
        const origin = request.headers.get("origin") || request.headers.get("host") || ""
        const slug = deriveTenantSlug(origin)
        
        // Güvenlik İzolasyonu: Hangi sales channel'da olduğumuzu öğrenmek için
        // Medusa backend'e güvenli bir mikro-istek atıyoruz.
        let salesChannelId: string | undefined = undefined
        try {
            const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
            const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
            
            const prodRes = await fetch(`${backendUrl}/store/products?limit=1`, {
                headers: {
                    "x-publishable-api-key": pubKey,
                    "x-tenant-slug": slug
                },
                next: { revalidate: 3600 }
            })
            if (prodRes.ok) {
                const prodData = await prodRes.json()
                const firstProduct = prodData.products?.[0]
                if (firstProduct && Array.isArray(firstProduct.sales_channels) && firstProduct.sales_channels.length > 0) {
                    salesChannelId = firstProduct.sales_channels[0].id
                }
            }
        } catch (err) {
            console.error("[Search Proxy] Sales Channel ID çözülemedi:", err)
        }
        
        // Güvenlik kalkanı: Multi-Tenant izole ise ve Kanal ID çözülemediyse arama yasaklanmalı
        if (!salesChannelId && process.env.TENANT_PRODUCT_ISOLATION !== "false") {
            salesChannelId = "sc_isolation_enforced_fallback_null"
        }

        if (!query.trim()) {
            return NextResponse.json({ hits: [], estimatedTotalHits: 0, processingTimeMs: 0 })
        }

        const results = await searchProducts(query, { limit, salesChannelId })

        return NextResponse.json(results)
    } catch (error: any) {
        console.error("[Search API] Hata:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
