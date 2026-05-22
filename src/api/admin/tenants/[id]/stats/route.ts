/**
 * Admin Tenant Stats Route — Mağaza İstatistik Panosu
 *
 * GET /admin/tenants/:id/stats → Mağazanın özet istatistiklerini döndür
 *
 * Sağladığı metrikler:
 * - Toplam ürün sayısı
 * - Toplam müşteri sayısı
 * - Toplam sipariş sayısı
 * - Aktif özellikler
 * - Mağaza sektörü ve yapılandırması
 *
 * Auth: Admin JWT zorunlu
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TENANT_MODULE } from "../../../../../modules/tenant"
import type TenantService from "../../../../../modules/tenant/service"

/**
 * GET /admin/tenants/:id/stats
 *
 * Mağaza dashboard'u için özet bilgiler.
 * AI ajanları tarafından da mağaza sağlık kontrolü için kullanılabilir.
 */
export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    try {
        const { id: tenantId } = req.params
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant ID zorunludur." })
        }

        const tenantService = req.scope.resolve(TENANT_MODULE) as TenantService
        const tenantResult = await tenantService.get(tenantId)
        if (!tenantResult.success) {
            return res.status(404).json({ error: tenantResult.message })
        }

        const query = req.scope.resolve("remoteQuery") as any

        // ─── Paralel olarak tüm sayıları çek ───
        const [productsResult, customersResult, ordersResult] = await Promise.allSettled([
            query({
                entity: "product",
                fields: ["id"],
                filters: { tenant: { tenant_id: tenantId } },
            }),
            query({
                entity: "customer",
                fields: ["id"],
                filters: { tenant: { tenant_id: tenantId } },
            }),
            query({
                entity: "order",
                fields: ["id"],
                filters: { tenant: { tenant_id: tenantId } },
            }),
        ])

        const productCount = productsResult.status === "fulfilled"
            ? (productsResult.value?.data?.length || 0)
            : 0
        const customerCount = customersResult.status === "fulfilled"
            ? (customersResult.value?.data?.length || 0)
            : 0
        const orderCount = ordersResult.status === "fulfilled"
            ? (ordersResult.value?.data?.length || 0)
            : 0

        // ─── Tenant bağlam bilgisini al ───
        const tenantContext = await tenantService.getTenantContext(tenantId)

        return res.json({
            tenant: tenantResult.data,
            stats: {
                product_count: productCount,
                customer_count: customerCount,
                order_count: orderCount,
            },
            context: tenantContext
                ? {
                    sector: tenantContext.sector,
                    locale: tenantContext.locale,
                    currency: tenantContext.currency,
                    features: tenantContext.features,
                    sector_config: tenantContext.sectorConfig,
                }
                : null,
        })

    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any
        logger.error(`[Tenant Stats] Hata: ${error instanceof Error ? error.message : "Bilinmeyen"}`)
        return res.status(500).json({ error: "Mağaza istatistikleri alınırken hata oluştu." })
    }
}
