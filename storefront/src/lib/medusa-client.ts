import Medusa from "@medusajs/js-sdk"
import { headers, cookies } from "next/headers"

// Server-side Medusa client (uses Docker internal URL)
const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

// Publishable API key — backend /store/* endpoint'leri için ZORUNLU header.
// NEXT_PUBLIC_ prefix tarayıcıya bundle edilir (storefront docker env'de set)
// MEDUSA_PUBLISHABLE_KEY fallback server-side için.
const PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
    process.env.MEDUSA_PUBLISHABLE_KEY ||
    ""

// Customer JWT token cookie name (set after login/register)
export const CUSTOMER_JWT_COOKIE = "_medusa_jwt"

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

  return new Medusa({
    baseUrl: BACKEND_URL,
    publishableKey: PUBLISHABLE_KEY,
    auth: {
      type: "session",
    },
    globalHeaders: {
      "x-tenant-slug": tenantSlug
    }
  })
}

/**
 * Authenticated Medusa SDK — JWT cookie içeren bearer token ile.
 * Bu istemci, oturumu açık müşteri için /store/customers/me, /store/orders gibi
 * korumalı endpoint'lere erişebilir.
 *
 * Cookie yoksa veya boşsa SDK yine de çalışır (publishable key ile),
 * ama Authorization header eklenmez — bu durumda /store/customers/me 401 döner.
 */
export const getAuthedMedusaClient = async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get(CUSTOMER_JWT_COOKIE)?.value
  const globalHeaders: Record<string, string> = {}
  if (token) {
    globalHeaders["Authorization"] = `Bearer ${token}`
  }
  return new Medusa({
    baseUrl: BACKEND_URL,
    publishableKey: PUBLISHABLE_KEY,
    auth: { type: "jwt", jwtTokenStorageMethod: "memory" },
    globalHeaders,
  })
}

// Geriye dönük uyumluluk (Eski singleton, tenant bağımsız durumlar için)
export const sdk = new Medusa({
  baseUrl: BACKEND_URL,
  publishableKey: PUBLISHABLE_KEY,
  auth: { type: "session" },
})

export default sdk
