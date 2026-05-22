/**
 * Admin Tenant Deactivate Route
 *
 * POST /admin/tenants/:id/deactivate → Mağazayı pasifleştir (askıya al)
 *
 * Mağazayı askıya alır. Askıya alınan mağazanın endpoint'leri
 * veri döndürmez, ürünleri listelenemez.
 *
 * Dürüstlük ilkesi:
 * - Mağaza silinmez, sadece devre dışı bırakılır (soft-deactivate)
 * - İstendiğinde /activate ile yeniden açılabilir
 * - İşlem sunucu loglarında kaydedilir
 *
 * Auth: Admin JWT zorunlu
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TENANT_MODULE } from "../../../../../modules/tenant"
import type TenantService from "../../../../../modules/tenant/service"

/**
 * POST /admin/tenants/:id/deactivate
 *
 * Param: id (UUID) — pasifleştirilecek mağazanın ID'si
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

        const result = await tenantService.deactivate(id)

        if (!result.success) {
            return res.status(404).json({ error: result.message })
        }

        return res.json({
            tenant: result.data,
            message: result.message,
        })

    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any
        logger.error(`[Tenant API] Pasifleştirme hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`)
        return res.status(500).json({
            error: "Mağaza pasifleştirilirken bir hata oluştu.",
        })
    }
}
