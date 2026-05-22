/**
 * Admin Tenant Product Unlink Route — Ürün Bağlantısını Kaldırma
 *
 * DELETE /admin/tenants/:id/products/:productId → Ürünü mağazadan ayır
 *
 * Ürünü silmez — sadece tenant ↔ product link'ini kaldırır.
 * Ürün sistemde kalmaya devam eder, sadece bu mağazadan ayrılır.
 *
 * Auth: Admin JWT zorunlu
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TENANT_MODULE } from "../../../../../../modules/tenant"
import type TenantService from "../../../../../../modules/tenant/service"

/**
 * DELETE /admin/tenants/:id/products/:productId
 *
 * Ürünü mağazadan ayırır (link dismiss).
 * Ürün silinmez, sadece mağaza ilişkisi kaldırılır.
 */
export const DELETE = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    try {
        const { id: tenantId, productId } = req.params
        if (!tenantId || !productId) {
            return res.status(400).json({
                error: "Tenant ID ve Product ID zorunludur.",
            })
        }

        // Tenant kontrolü
        const tenantService = req.scope.resolve(TENANT_MODULE) as TenantService
        const tenantResult = await tenantService.get(tenantId)
        if (!tenantResult.success) {
            return res.status(404).json({ error: tenantResult.message })
        }

        // Link'i kaldır
        const remoteLink = req.scope.resolve("remoteLink") as any
        await remoteLink.dismiss({
            [TENANT_MODULE]: { tenant_id: tenantId },
            product: { product_id: productId },
        })

        const logger = req.scope.resolve("logger") as any
        logger.info(
            `[Tenant Products] Ürün ${productId} → Tenant ${tenantId} bağlantısı kaldırıldı.`
        )

        return res.json({
            message: `Ürün ${productId} mağazadan başarıyla ayrıldı.`,
        })

    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any
        logger.error(`[Tenant Products] Unlink hatası: ${error instanceof Error ? error.message : "Bilinmeyen"}`)
        return res.status(500).json({ error: "Ürün bağlantısı kaldırılırken hata oluştu." })
    }
}
