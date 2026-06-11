import { NextRequest, NextResponse } from "next/server"
import { deriveTenantSlug } from "@/lib/tenant-slug"

const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "tr"

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip middleware for static files, api routes, _next
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next()
  }

  // ─── 1. TENANT ALGILAMA (Subdomain veya Özel Domain) ───
  // Mantık lib/tenant-slug.ts'te — /api proxy'leri de aynı fonksiyonu kullanır.
  const host = request.headers.get("host") || ""
  const tenantSlug = deriveTenantSlug(host)

  // Header'ları kopyala ve tenant slug'ı enjekte et
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-tenant-slug", tenantSlug)

  // ─── 2. ROTA YÖNLENDİRMELERİ ───
  // Check if path already has a country code
  const pathParts = pathname.split("/")
  const possibleCountry = pathParts[1]

  // If path doesn't start with a country code, redirect
  if (!possibleCountry || possibleCountry.length !== 2) {
    return NextResponse.redirect(
      new URL(`/${DEFAULT_REGION}${pathname}`, request.url)
    )
  }

  // Sonuç olarak request header'ları ile devam et
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
