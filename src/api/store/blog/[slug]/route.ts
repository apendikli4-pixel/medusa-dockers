import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { BLOG_MODULE } from "../../../../modules/blog"
import type BlogModuleService from "../../../../modules/blog/service"

/**
 * GET /store/blog/:slug
 * Tek bir yayınlanmış blog yazısını slug ile getirir.
 * Taslak (draft) yazılar 404 döner.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const { slug } = req.params
    const blogService = req.scope.resolve(BLOG_MODULE) as BlogModuleService

    const posts = await blogService.listBlogPosts({
        slug,
        status: "published",
    })

    const post = posts?.[0]
    if (!post) {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, "Blog yazısı bulunamadı")
    }

    res.json({ post })
}
