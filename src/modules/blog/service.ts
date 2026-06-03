import { MedusaService } from "@medusajs/framework/utils"
import BlogPost from "./models/blog-post"

/**
 * BlogModuleService — MedusaService ile otomatik CRUD.
 *
 * Üretilen metodlar (BlogPost için):
 *   - createBlogPosts / listBlogPosts / listAndCountBlogPosts
 *   - retrieveBlogPost / updateBlogPosts / deleteBlogPosts
 *
 * AI içerik üretimi API katmanında Ayna modülü ile yapılır;
 * bu servis yalnızca veri kalıcılığından sorumludur (tek sorumluluk).
 */
class BlogModuleService extends MedusaService({
    BlogPost,
}) {}

export default BlogModuleService
