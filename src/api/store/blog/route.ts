import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_ENGINE_MODULE } from "../../../modules/content_engine"

/**
 * GET /store/blog
 * Yayınlanmış blog yazılarını listeler (storefront blog sayfası için).
 *
 * NOT: Admin "Blog" arayüzü (/admin/posts) content_engine modülüne yazıyor.
 * Storefront da AYNI modülü okur ki yayınlanan yazılar anında görünsün.
 * (Eski ayrı `blog` modülü yerine content_engine — tek kaynak.)
 *
 * Query: limit, offset
 * Yanıt: { posts, count, limit, offset } — sadece status="published"
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const content = req.scope.resolve(CONTENT_ENGINE_MODULE) as any

    const limit = parseInt((req.query.limit as string) || "20", 10)
    const offset = parseInt((req.query.offset as string) || "0", 10)

    // Çoklu mağaza: yalnızca AKTİF mağazanın (tenant) yazıları görünür.
    const tenantId = (req as any).tenant_id

    const [posts, count] = await content.listAndCountPosts(
        { status: "published", ...(tenantId ? { tenant_id: tenantId } : {}) },
        {
            select: ["id", "slug", "title", "excerpt", "image", "published_at", "created_at"],
            skip: offset,
            take: limit,
            order: { created_at: "DESC" },
        }
    )

    // Storefront blog şemasına eşle (thumbnail = image, published_at fallback).
    const mapped = (posts || []).map((p: any) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        thumbnail: p.image || null,
        published_at: p.published_at || p.created_at,
        ai_generated: true,
    }))

    res.json({ posts: mapped, count, limit, offset })
}
