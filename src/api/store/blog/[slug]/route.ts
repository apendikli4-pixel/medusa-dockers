import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { CONTENT_ENGINE_MODULE } from "../../../../modules/content_engine"

/**
 * GET /store/blog/:slug
 * Tek bir yayınlanmış blog yazısını slug ile getirir (content_engine).
 * Taslak (draft) yazılar 404 döner. Admin "Blog" arayüzüyle aynı kaynak.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const { slug } = req.params
    const content = req.scope.resolve(CONTENT_ENGINE_MODULE) as any

    // Çoklu mağaza: yazı yalnızca AKTİF mağazaya aitse görünür.
    const tenantId = (req as any).tenant_id
    const posts = await content.listPosts({ slug, status: "published", ...(tenantId ? { tenant_id: tenantId } : {}) })
    const p = posts?.[0]
    if (!p) {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, "Blog yazısı bulunamadı")
    }

    const post = {
        id: p.id,
        slug: p.slug,
        title: p.title,
        content: p.content,
        excerpt: p.excerpt,
        thumbnail: p.image || null,
        seo_title: p.seo_title || p.title,
        seo_description: p.seo_description || p.excerpt || p.title,
        published_at: p.published_at || p.created_at,
        ai_generated: true,
        author: p.author || null,
    }

    res.json({ post })
}
