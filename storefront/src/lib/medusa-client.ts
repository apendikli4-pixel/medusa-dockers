import Medusa from "@medusajs/js-sdk"
import { headers } from "next/headers"

// Server-side Medusa client (uses Docker internal URL)
const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

/**
 * Dinamik Medusa Client Üretici
 * Next.js Server Components ve Server Actions içinde kullanılır.
 * 
 * middleware.ts tarafından yakalanan domain/subdomain bilgisi
 * 'x-tenant-slug' header'ı olarak buraya ulaşır. Bu header,
 * Medusa backend'e iletilir ve backend bu slug üzerinden
 * doğru mağazayı (tenant) ve publishable key'i bulur.
 */
export const getMedusaClient = async () => {
  // Next.js 15+ headers() requires await
  const headersList = await headers()
  const tenantSlug = headersList.get("x-tenant-slug") || "default"
  
  // Publishable API Key Backend Middleware tarafından enjekte edilecek
  // Client tarafında manuel yönetmeye gerek yok, dürüstlük ilkesi!
  return new Medusa({
    baseUrl: BACKEND_URL,
    auth: {
      type: "session",
    },
    // Tüm isteklere tenant bilgisini otomatik ekle
    globalHeaders: {
      "x-tenant-slug": tenantSlug
    }
  })
}

// Geriye dönük uyumluluk (Eski singleton, tenant bağımsız durumlar için)
export const sdk = new Medusa({
  baseUrl: BACKEND_URL,
  auth: { type: "session" },
})

export default sdk
