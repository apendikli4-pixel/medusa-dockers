/**
 * Base URL — istek host'undan türetilir (çoklu mağaza).
 *
 * N mağaza = sıfır config: her mağaza kendi domain'iyle (vozol.x.sslip.io,
 * aqua.x.sslip.io, özel domain…) doğru mutlak URL üretir. JSON-LD, OpenGraph,
 * sitemap ve robots bu helper'ı kullanır — host asla hardcode edilmez.
 *
 * headers() okunamayan bağlamlarda (statik üretim vb.) env'e, o da yoksa
 * localhost'a düşer.
 */
import "server-only"
import { headers } from "next/headers"

export async function getBaseUrl(): Promise<string> {
    try {
        const h = await headers()
        const host = h.get("x-forwarded-host") || h.get("host")
        if (host) {
            const isLocal = host.includes("localhost") || host.startsWith("127.")
            const proto = h.get("x-forwarded-proto") || (isLocal ? "http" : "https")
            return `${proto}://${host}`
        }
    } catch {
        // headers() bu bağlamda yok — env fallback
    }
    return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"
}
