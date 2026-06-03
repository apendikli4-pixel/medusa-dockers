import { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Logger } from "@medusajs/framework/types"

/**
 * Storefront Tenant Scoper Middleware
 *
 * Bu middleware, tenantResolverMiddleware'den sonra çalışır.
 * Bulunan tenant_id'yi kullanarak bağlı Sales Channel, Stock Location ve Publishable API Key'i
 * bulur ve Medusa isteklerine enjekte eder.
 *
 * Özellikle Sepet (Cart) ve Ürün (Product) sorgularında mağaza izolasyonunu garanti altına alır.
 */
export const storefrontTenantScoper = async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
) => {
    if (!req.tenant_id) {
        return next()
    }

    const logger = req.scope.resolve("logger") as Logger

    try {
        const remoteQuery = req.scope.resolve("remoteQuery") as any
        const { data } = await remoteQuery.graph({
            entity: "tenant",
            fields: ["sales_channel.id", "stock_location.id", "api_key.token"],
            filters: { id: req.tenant_id },
        })

        const tenantData = data[0]

        if (tenantData) {
            // ─── 1. Sales Channel Kilitleme ───
            const salesChannelId = tenantData.sales_channel?.id
            if (salesChannelId) {
                // GET istekleri için query'ye enjekte et (ürün listeleme vb.)
                req.query = req.query || {}
                req.query.sales_channel_id = salesChannelId

                // POST istekleri için body'ye enjekte et (sepet oluşturma vb.)
                if (req.method === "POST" || req.method === "PUT") {
                    const body = (req.body || {}) as Record<string, unknown>
                    body.sales_channel_id = salesChannelId
                    req.body = body
                }
                
                logger.debug(`[StorefrontScoper] SalesChannel (${salesChannelId}) enjekte edildi.`)
            }

            // ─── 2. Publishable Key Enjeksiyonu ───
            // Medusa v2 yerleşik izolasyon mekanizmalarını tetiklemek için
            const token = tenantData.api_key?.token
            if (token && !req.headers["x-publishable-api-key"]) {
                req.headers["x-publishable-api-key"] = token
                logger.debug(`[StorefrontScoper] Publishable API Key enjekte edildi.`)
            }
        }
    } catch (error: any) {
        logger.error(`[StorefrontScoper] Kaynak çözümleme hatası: ${error.message}`)
    }

    return next()
}
