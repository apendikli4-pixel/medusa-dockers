/**
 * Tenant helper — server-side.
 *
 * Backend'in /store/tenants/me endpoint'ini çağırır. Middleware tarafından
 * çözümlenen mevcut tenant'ın sektör + tema bilgisini döner.
 *
 * Tenant resolve edilemezse null döner; çağıran taraf default 'retail'
 * temasına geri düşer.
 */
import "server-only"
import { headers } from "next/headers"
import type { SectorKey } from "../themes"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
    process.env.MEDUSA_PUBLISHABLE_KEY ||
    ""

export type StoreTenant = {
    id: string
    slug: string
    name: string
    sector: SectorKey | string
    theme: {
        primaryColor: string | null
        secondaryColor: string | null
        logo: string | null
    }
    contact: {
        phone: string | null
        email: string | null
        address: string | null
    }
    storefront?: {
        contact?: { person?: string, phone?: string, email?: string, address?: string }
        socials?: { instagram?: string, facebook?: string, x?: string, youtube?: string }
        links?: { kurumsal?: string, musteri?: string, yasal?: string }
    }
    features: string[]
}

/**
 * Mevcut request için tenant bilgisini getir.
 * Hata olursa null döner — layout/header fallback temayla çalışmaya devam eder.
 *
 * Cache: aynı tenant slug'ı için 5 dakika boyunca cache'lenir (Next fetch revalidate).
 */
export async function retrieveCurrentTenant(): Promise<StoreTenant | null> {
    try {
        const hdrs = await headers()
        const tenantSlug = hdrs.get("x-tenant-slug") || "default"

        // Sabit timeout: backend dahili çağrısı asılırsa (ağ/sıralama sorunu) tüm
        // sayfaların 504 vermesini engeller — süre dolarsa null dönüp fallback temaya düşeriz.
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 4000)

        let res: Response
        try {
            res = await fetch(`${BACKEND_URL}/store/tenants/me`, {
                method: "GET",
                headers: {
                    "x-publishable-api-key": PUBLISHABLE_KEY,
                    "x-tenant-slug": tenantSlug,
                },
                signal: controller.signal,
                next: { revalidate: 300, tags: [`tenant:${tenantSlug}`] },
            })
        } finally {
            clearTimeout(timer)
        }
        if (!res.ok) return null
        const json = (await res.json()) as { tenant?: StoreTenant }
        return json?.tenant ?? null
    } catch {
        return null
    }
}
