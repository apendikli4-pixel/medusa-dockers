/**
 * GET /store/sector/rules
 *
 * Storefront'un, içinde bulunduğu tenant'ın sektörel kurallarını UI'da
 * uygulamak için çağırdığı endpoint.
 *
 * Örnek kullanım (Next.js Server Component):
 *   const { rules } = await fetch("/store/sector/rules").then(r => r.json())
 *   if (rules.requiresDeliveryDate) { showDatePicker() }
 *
 * Tenant tespiti:
 *   tenant-resolver middleware tarafından req.tenant_context'e enjekte edilir.
 *   Middleware tenant bulamadıysa zaten 404 dönmüştür — buraya girmez.
 *
 * Bu endpoint hassas veri içermez ama tenant-spesifik olduğu için
 * public-cache uygun değildir; CDN cache'lenmemelidir.
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SectorRegistry } from "../../../../lib/sector-framework"
import { withErrorHandler, validationError } from "../../../../lib/error-handler"

interface TenantContextOnRequest {
    tenant_id?: string
    sector?: string
}

export const GET = withErrorHandler(async (req: MedusaRequest, res: MedusaResponse) => {
    const ctx = (req as MedusaRequest & { tenant_context?: TenantContextOnRequest }).tenant_context

    if (!ctx?.sector) {
        throw validationError(
            "Mağaza bağlamı çözümlenemedi. Lütfen mağaza alt-alan adı veya x-tenant-id başlığı gönderdiğinizden emin olun."
        )
    }

    if (!SectorRegistry.isSupported(ctx.sector)) {
        throw validationError(
            `Mağazanın yapılandırılmış sektörü ('${ctx.sector}') sistemde tanımlı değil.`
        )
    }

    const config = SectorRegistry.get(ctx.sector)

    res.setHeader("Cache-Control", "no-store")
    res.json({
        sector: {
            code: config.code,
            displayName: config.displayName,
            description: config.description,
        },
        rules: config.rules,
        defaultSettings: config.defaultSettings,
    })
})
