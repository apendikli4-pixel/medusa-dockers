import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { backendProxyHeaders } from "@/lib/server/proxy-headers"
import { deriveTenantSlug } from "@/lib/tenant-slug"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

export async function GET() {
    try {
        // Slug URL'ye de eklenir: fetch cache anahtarı kesin olarak mağaza-bazlı
        // ayrışsın (Vozol, Aqua'nın 1 saatlik SSS cache'ini devralmasın).
        const hdrs = await headers()
        const slug = deriveTenantSlug(hdrs.get("host") || "")
        const response = await fetch(`${BACKEND_URL}/store/faq?tenant=${encodeURIComponent(slug)}`, {
            headers: await backendProxyHeaders(),
            next: { revalidate: 3600 } // SSS sayfaları sık değişmez, 1 saat cache
        })
        
        const data = await response.json()
        return NextResponse.json(data, { status: response.status })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
