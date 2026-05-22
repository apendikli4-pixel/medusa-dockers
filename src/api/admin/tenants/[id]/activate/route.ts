/**
 * Admin Tenant Activate Route
 *
 * POST /admin/tenants/:id/activate → Mağazayı aktifleştir
 *
 * Askıya alınmış bir mağazayı yeniden aktif hale getirir.
 * Aktif bir mağaza üzerinde çağrılırsa, idempotent davranır (hata vermez).
 *
 * Auth: Admin JWT zorunlu
 * Dürüstlük ilkesi: İşlem loglanır, durum şeffaf olarak raporlanır.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TENANT_MODULE } from "../../../../../modules/tenant"
import type TenantService from "../../../../../modules/tenant/service"

/**
 * POST /admin/tenants/:id/activate
 *
 * Param: id (UUID) — aktifleştirilecek mağazanın ID'si
 * Response: { tenant: Tenant, message: string }
 * Hata: 404 (mağaza bulunamadı), 500 (sunucu hatası)
 */
export const POST = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    try {
        const tenantService = req.scope.resolve(TENANT_MODULE) as TenantService
        const { id } = req.params

        if (!id) {
            return res.status(400).json({ error: "Mağaza ID'si zorunludur." })
        }

        const result = await tenantService.activate(id)

        if (!result.success) {
            return res.status(404).json({ error: result.message })
        }

        return res.json({
            tenant: result.data,
            message: result.message,
        })

    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any
        logger.error(`[Tenant API] Aktifleştirme hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`)
        return res.status(500).json({
            error: "Mağaza aktifleştirilirken bir hata oluştu.",
        })
    }
}
