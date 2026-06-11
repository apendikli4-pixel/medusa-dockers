import { NextResponse } from "next/server"
import { deriveTenantSlug } from "@/lib/tenant-slug"

// Storefront → Medusa Backend Proxy
// İstemcinin doğrudan backend'e gitmesini engeller,
// böylece CORS sorunları çözülür ve güvenli server-to-server iletişim sağlanır.
export async function POST(req: Request) {
  try {
    const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

    // Cookie'leri proxy'e taşı
    const cookieHeader = req.headers.get("cookie") || ""

    // ÇOKLU MAĞAZA: Next middleware /api rotalarını atladığı için x-tenant-slug
    // burada Host'tan türetilip backend'e İLETİLMEK ZORUNDA. İletilmezse backend
    // tenant'ı çözemez → AI hangi mağazada olduğunu bilmez (sektör "retail"e düşer,
    // ürün izolasyonu ve tenant-bazlı cache devre dışı kalır).
    const tenantSlug = deriveTenantSlug(req.headers.get("host") || "")

    const body = await req.json()

    const response = await fetch(`${backendUrl}/store/ayna/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": publishableKey,
        "x-tenant-slug": tenantSlug,
        "Cookie": cookieHeader
      },
      body: JSON.stringify(body),
      // Auth cookie'sini korumak için include
      credentials: "omit" // Server tarafında yapıldığı için
    })

    const data = await response.json()
    
    // Medusa'dan dönen set-cookie varsa al ve client'a aktar
    const headers = new Headers()
    const setCookie = response.headers.get("set-cookie")
    if (setCookie) {
      headers.set("set-cookie", setCookie)
    }

    return NextResponse.json(data, {
      status: response.status,
      headers
    })
  } catch (error) {
    console.error("[Chat Proxy] Error:", error)
    return NextResponse.json(
      { error: "Sistemle bağlantı kurulamadı." },
      { status: 500 }
    )
  }
}
