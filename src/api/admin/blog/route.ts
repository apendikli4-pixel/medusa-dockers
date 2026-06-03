import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { BLOG_MODULE } from "../../../modules/blog"
import type BlogModuleService from "../../../modules/blog/service"

/**
 * GET /admin/blog — Tüm blog yazılarını listeler (taslak dahil).
 * POST /admin/blog — Yeni blog yazısı oluşturur.
 *
 * AI içerik üretimi için: POST /admin/blog/generate (ayrı route).
 */

const BlogCreateSchema = z.object({
    title: z.string().min(1, "Başlık zorunlu"),
    slug: z.string().min(1, "Slug zorunlu"),
    content: z.string().min(1, "İçerik zorunlu"),
    excerpt: z.string().optional(),
    seo_title: z.string().optional(),
    seo_description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    thumbnail: z.string().optional(),
    status: z.enum(["draft", "published"]).optional().default("draft"),
    ai_generated: z.boolean().optional().default(false),
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const blogService = req.scope.resolve(BLOG_MODULE) as BlogModuleService
    const limit = parseInt((req.query.limit as string) || "50", 10)
    const offset = parseInt((req.query.offset as string) || "0", 10)

    const [posts, count] = await blogService.listAndCountBlogPosts(
        {},
        { skip: offset, take: limit, order: { created_at: "DESC" } }
    )

    res.json({ posts, count, limit, offset })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    const validated = BlogCreateSchema.parse(req.body)
    const blogService = req.scope.resolve(BLOG_MODULE) as BlogModuleService

    const published = validated.status === "published"
    const [post] = await blogService.createBlogPosts([
        {
            ...validated,
            published_at: published ? new Date() : null,
        } as any,
    ])

    res.status(201).json({ post })
}
