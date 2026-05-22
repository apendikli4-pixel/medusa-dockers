/**
 * Store Tenant Route — Mağaza Bilgisi Endpoint'i
 *
 * GET /store/tenant → Mevcut isteğin bağlı olduğu mağaza bilgisini döndürür
 *
 * Bu endpoint, storefront ve AI ajanları tarafından kullanılır:
 * - Storefront: Mağaza adı, teması, sektörü, özellikleri
 * - Sektörel İçerik Ajanı: tenant_id üzerinden sektör bilgisini alır,
 *   ürün açıklamalarını sektöre göre uyarlar
 * - Dinamik Müşteri Destek Ajanı: mağazanın politikalarını ve üslubunu öğrenir
 *
 * Auth: Gerekmez (tenant resolver middleware zaten tenant bilgisini ekler)
 * x-publishable-api-key header'ı zorunlu (Medusa store convention)
 *
 * Dürüstlük ilkesi:
 * - Tenant bulunamazsa 404 döner, belirsiz mesaj verilmez
 * - Pasif mağaza bilgisi döndürülmez
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/tenant
 *
 * Response:
 * {
 *   tenant: {
 *     id, name, slug, sector, settings, features,
 *     is_active, domain, metadata
 *   }
 * }
 *
 * Hata:
 * - 404: Tenant çözümlenemedi (header eksik veya geçersiz)
 * - 500: Sunucu hatası
 */
export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    try {
        // Tenant resolver middleware tarafından eklenen tenant bilgisi
        const tenant = req.tenant

        if (!tenant) {
            return res.status(404).json({
                error: "Mağaza bilgisi bulunamadı. " +
                    "x-tenant-id, x-tenant-slug header'ı veya geçerli bir domain gereklidir.",
            })
        }

        // Hassas bilgileri çıkar (owner_id gibi internal alanlar store'a verilmez)
        const { owner_id, ...publicTenantData } = tenant

        return res.json({
            tenant: publicTenantData,
        })

    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any
        logger.error(
            `[Store Tenant API] Mağaza bilgisi getirme hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`
        )
        return res.status(500).json({
            error: "Mağaza bilgileri getirilirken bir hata oluştu.",
        })
    }
}
