import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BLOG_MODULE } from "../../../modules/blog"
import type BlogModuleService from "../../../modules/blog/service"

/**
 * GET /store/blog
 * Yayınlanmış blog yazılarını listeler (storefront blog sayfası için).
 *
 * Query: limit, offset
 * Yanıt: { posts, count, limit, offset }
 *
 * Sadece status="published" döner (taslaklar gizli).
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const blogService = req.scope.resolve(BLOG_MODULE) as BlogModuleService

    const limit = parseInt((req.query.limit as string) || "20", 10)
    const offset = parseInt((req.query.offset as string) || "0", 10)

    const [posts, count] = await blogService.listAndCountBlogPosts(
        { status: "published" },
        {
            select: [
                "id",
                "slug",
                "title",
                "excerpt",
                "thumbnail",
                "published_at",
                "ai_generated",
            ],
            skip: offset,
            take: limit,
            order: { published_at: "DESC" },
        }
    )

    res.json({ posts, count, limit, offset })
}
