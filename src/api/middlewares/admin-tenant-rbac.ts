import { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Logger } from "@medusajs/framework/types"

/**
 * Admin Role-Based Access Control (RBAC) Middleware
 *
 * Standart /admin/products ve /admin/orders rotalarının önüne geçerek,
 * admin kullanıcısının (auth_context.actor_id) bağlı olduğu mağazayı bulur
 * ve sorgulara zorunlu sales_channel_id filtresi ekler.
 *
 * Bu sayede mağaza sahiplerinin birbirlerinin ürünlerini veya siparişlerini
 * görmesi (Data Leakage) engellenir.
 */
export const adminTenantRbac = async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
) => {
    const actorId = req.auth_context?.actor_id

    // Eğer oturum açmamışsa veya auth_context yoksa pas geç (diğer auth guard'lar engelleyecektir)
    if (!actorId) {
        return next()
    }

    const logger = req.scope.resolve("logger") as Logger

    try {
        const remoteQuery = req.scope.resolve("remoteQuery") as any
        
        // Admin'in sahip olduğu tenant'ı bul
        const { data: tenantData } = await remoteQuery.graph({
            entity: "tenant",
            fields: ["id", "sales_channel.id"],
            filters: { owner_id: actorId },
        })

        const tenant = tenantData[0]

        // Eğer kullanıcı bir mağaza sahibi ise, verilerini filtrele
        // (Sistem adminleri için tenant null dönebilir, onlara full yetki verilir)
        if (tenant && tenant.sales_channel?.id) {
            const salesChannelId = tenant.sales_channel.id

            // GET listeleme filtrelerine ekle
            req.query = req.query || {}
            req.query.sales_channel_id = salesChannelId

            // POST/PUT body filtrelerine ekle (ürün oluşturma/güncelleme)
            if (req.method === "POST" || req.method === "PUT") {
                const body = (req.body || {}) as Record<string, unknown>
                
                // Medusa V2'de ürün oluştururken sales_channels formatı [{id: "..."}] şeklindedir
                if ((req.path.includes("/products") || req.path.includes("/orders")) && !body.sales_channels) {
                    body.sales_channels = [{ id: salesChannelId }]
                }
                req.body = body
            }

            logger.debug(`[AdminRBAC] Admin ${actorId} isteği SalesChannel ${salesChannelId} ile sınırlandırıldı.`)
        } else {
            logger.debug(`[AdminRBAC] Admin ${actorId} bir tenant'a bağlı değil, global yetki kullanılıyor.`)
        }
    } catch (error: any) {
        logger.error(`[AdminRBAC] Rol denetimi sırasında hata: ${error.message}`)
        // Güvenlik: Hata durumunda fail-closed olmak daha iyidir, ancak Medusa core adminlerini
        // de kilitleriz diye şimdilik devam ediyoruz. Gerçek prod ortamında 403 dönülebilir.
    }

    return next()
}
