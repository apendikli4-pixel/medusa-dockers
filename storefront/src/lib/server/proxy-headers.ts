/**
 * /api proxy route'ları için ortak backend header'ları.
 *
 * Next middleware matcher'ı /api'yi ATLAR; x-tenant-slug header'ı API
 * route'larına hiç ulaşmaz. Bu yüzden slug burada Host'tan yeniden türetilir
 * ve her proxy çağrısında backend'e iletilir — backend tenant-resolver'ı
 * isteğin hangi mağazadan geldiğini ancak böyle bilebilir.
 * (Chat'teki "AI mağazasını bilmiyor" hatasının köküydü; tüm proxy'ler
 * aynı yardımcıyı kullanır ki kalıp bir daha ayrışmasın.)
 */
import "server-only"
import { headers } from "next/headers"
import { deriveTenantSlug } from "../tenant-slug"

const PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
    process.env.MEDUSA_PUBLISHABLE_KEY ||
    ""

export async function backendProxyHeaders(): Promise<Record<string, string>> {
    const hdrs = await headers()
    return {
        "x-publishable-api-key": PUBLISHABLE_KEY,
        "x-tenant-slug": deriveTenantSlug(hdrs.get("host") || ""),
    }
}
