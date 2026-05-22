/**
 * Store Tenant Products Route — Mağaza Vitrin Ürünleri
 *
 * GET /store/tenant/products → Mevcut mağazanın ürünlerini listele
 *
 * Bu endpoint, storefront tarafından kullanılır.
 * Tenant resolver middleware tarafından belirlenen mağazanın
 * ürünlerini döndürür.
 *
 * Kullanım senaryoları:
 * - Storefront ana sayfa ürün listesi
 * - Dinamik Müşteri Destek Ajanı: "Bu mağazada şu ürün var mı?"
 * - Sektörel İçerik Ajanı: ürün bilgilerini sektöre göre formatla
 *
 * Auth: Gerekmez (tenant resolver yeterli)
 * x-publishable-api-key zorunlu (Medusa store convention)
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"

const ListQuerySchema = z.object({
    limit: z.coerce.number().min(1).max(100).optional().default(20),
    offset: z.coerce.number().min(0).optional().default(0),
    q: z.string().optional(),
    category_id: z.string().optional(),
    collection_id: z.string().optional(),
    order: z.string().optional().default("-created_at"),
})

/**
 * GET /store/tenant/products
 *
 * Mağazanın published ürünlerini döndürür.
 * Hassas bilgiler (cost, internal metadata) filtrelenir.
 *
 * Query parametreleri:
 * - limit (number, varsayılan: 20)
 * - offset (number, varsayılan: 0)
 * - q (string, opsiyonel) — arama terimi
 * - category_id (string, opsiyonel) — kategoriye göre filtrele
 * - collection_id (string, opsiyonel) — koleksiyona göre filtrele
 * - order (string, varsayılan: "-created_at") — sıralama
 */
export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    try {
        // ─── Tenant bağlamı kontrolü ───
        const tenant = req.tenant
        const tenantId = req.tenant_id

        if (!tenant || !tenantId) {
            return res.status(404).json({
                error: "Mağaza bilgisi bulunamadı. " +
                    "x-tenant-id veya x-tenant-slug header'ı gereklidir.",
            })
        }

        const parsed = ListQuerySchema.parse(req.query)
        const query = req.scope.resolve("remoteQuery") as any

        // ─── Filtreleri oluştur ───
        const filters: Record<string, unknown> = {
            tenant: {
                tenant_id: tenantId,
            },
            status: "published", // Sadece yayınlanmış ürünler
        }

        if (parsed.category_id) {
            filters.category_id = parsed.category_id
        }
        if (parsed.collection_id) {
            filters.collection_id = parsed.collection_id
        }

        // ─── remoteQuery ile ürünleri çek ───
        const { data: products } = await query({
            entity: "product",
            fields: [
                "id",
                "title",
                "handle",
                "subtitle",
                "description",
                "thumbnail",
                "status",
                "created_at",
                "updated_at",
                "collection_id",
                "type_id",
                "tags.id",
                "tags.value",
                "options.id",
                "options.title",
                "options.values.id",
                "options.values.value",
                "variants.id",
                "variants.title",
                "variants.sku",
                "variants.barcode",
                "variants.manage_inventory",
                "variants.prices.amount",
                "variants.prices.currency_code",
                "variants.options.id",
                "variants.options.value",
                "images.id",
                "images.url",
            ],
            filters,
            pagination: {
                take: parsed.limit,
                skip: parsed.offset,
                order: parsed.order
                    ? { [parsed.order.replace("-", "")]: parsed.order.startsWith("-") ? "DESC" : "ASC" }
                    : { created_at: "DESC" },
            },
        })

        // ─── Basit metin araması (q parametresi) ───
        let filteredProducts = products || []
        if (parsed.q) {
            const searchTerm = parsed.q.toLowerCase()
            filteredProducts = filteredProducts.filter((p: any) =>
                p.title?.toLowerCase().includes(searchTerm) ||
                p.description?.toLowerCase().includes(searchTerm) ||
                p.handle?.toLowerCase().includes(searchTerm)
            )
        }

        return res.json({
            products: filteredProducts,
            count: filteredProducts.length,
            limit: parsed.limit,
            offset: parsed.offset,
            tenant: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                sector: tenant.sector,
            },
        })

    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: "Geçersiz sorgu.", details: error.errors })
        }
        logger.error(`[Store Tenant Products] Hata: ${error instanceof Error ? error.message : "Bilinmeyen"}`)
        return res.status(500).json({ error: "Ürünler listelenirken hata oluştu." })
    }
}
