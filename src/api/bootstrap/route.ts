import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * GET /bootstrap?token=<BOOTSTRAP_SECRET>
 *
 * Geçici kurulum/doğrulama endpoint'i. BOOTSTRAP_SECRET env'i ile korunur
 * (eşleşmezse 404). Seed sonrası durumu döndürür:
 *  - publishableKey (frontend için zaten gizli değildir)
 *  - ürün / kategori / region sayıları
 *
 * /admin değil /store değil → ne admin-auth ne publishable-key middleware'i uygulanır.
 * Kurulum bittikten sonra BOOTSTRAP_SECRET kaldırılarak devre dışı bırakılır.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const secret = process.env.BOOTSTRAP_SECRET
    const provided = (req.query.token as string) || (req.headers["x-bootstrap-token"] as string)
    if (!secret || provided !== secret) {
        return res.status(404).json({ message: "Not found" })
    }

    const out: Record<string, any> = {}

    try {
        const apiKey = req.scope.resolve(Modules.API_KEY) as any
        const keys = await apiKey.listApiKeys({ type: "publishable" })
        out.publishableKey = keys?.[0]?.token || null
        out.publishableKeyCount = keys?.length || 0
    } catch (e: any) {
        out.apiKeyError = e.message
    }

    try {
        const product = req.scope.resolve(Modules.PRODUCT) as any
        const [, productCount] = await product.listAndCountProducts({}, { take: 1 })
        out.productCount = productCount
        const [, categoryCount] = await product.listAndCountProductCategories({}, { take: 1 })
        out.categoryCount = categoryCount
    } catch (e: any) {
        out.productError = e.message
    }

    try {
        const region = req.scope.resolve(Modules.REGION) as any
        const [, regionCount] = await region.listAndCountRegions({}, { take: 1 })
        out.regionCount = regionCount
    } catch (e: any) {
        out.regionError = e.message
    }

    try {
        const sc = req.scope.resolve(Modules.SALES_CHANNEL) as any
        const [, scCount] = await sc.listAndCountSalesChannels({}, { take: 1 })
        out.salesChannelCount = scCount
    } catch (e: any) {
        out.salesChannelError = e.message
    }

    return res.json(out)
}
