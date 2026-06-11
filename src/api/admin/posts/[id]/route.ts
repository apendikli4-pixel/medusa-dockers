import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MODULES, IContentEngineService } from "../../../../types/index"
import { z } from "@medusajs/framework/zod"

/**
 * /admin/posts/:id — Tek blog yazısı (content_engine).
 *   GET    → yazıyı getir (düzenleme ekranı yükler)
 *   POST   → yazıyı güncelle/yayınla (kapak görseli dahil)
 *   DELETE → yazıyı sil
 *
 * Admin "Blog" arayüzü bu route'ları çağırır. (Önceden yoktu → "Yazı yüklenirken
 * hata oluştu" + düzenleme/görsel ekleme çalışmıyordu.)
 */

const UpdateSchema = z.object({
    title: z.string().optional(),
    slug: z.string().optional(),
    content: z.string().optional(),
    image: z.string().optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
    status: z.enum(["draft", "published", "archived"]).optional(),
    author: z.string().optional().nullable(),
    excerpt: z.string().optional().nullable(),
    seo_title: z.string().optional().nullable(),
    seo_description: z.string().optional().nullable(),
    // Çoklu mağaza: yazıyı başka bir mağazaya taşımak için.
    tenant_id: z.string().optional().nullable(),
})

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Unknown error")

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    try {
        const content = req.scope.resolve(MODULES.CONTENT_ENGINE) as unknown as IContentEngineService
        const { id } = req.params
        const post = await (content as any).retrievePost(id)
        return res.json({ post })
    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any
        logger.error(`[Content Engine API] Error retrieving post: ${errMsg(error)}`)
        return res.status(404).json({ error: "Yazı bulunamadı" })
    }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    try {
        const content = req.scope.resolve(MODULES.CONTENT_ENGINE) as unknown as IContentEngineService
        const { id } = req.params
        const data = UpdateSchema.parse(req.body)

        const updateData: any = {}
        if (data.title !== undefined) updateData.title = data.title
        if (data.slug !== undefined) updateData.slug = data.slug
        if (data.content !== undefined) updateData.content = data.content
        if (data.image !== undefined) updateData.image = data.image || null
        if (data.metadata !== undefined) updateData.metadata = data.metadata || null
        if (data.author !== undefined) updateData.author = data.author || null
        if (data.excerpt !== undefined) updateData.excerpt = data.excerpt || null
        if (data.seo_title !== undefined) updateData.seo_title = data.seo_title || null
        if (data.seo_description !== undefined) updateData.seo_description = data.seo_description || null
        if (data.tenant_id !== undefined) updateData.tenant_id = data.tenant_id || null
        if (data.status) {
            updateData.status = data.status
            if (data.status === "published") updateData.published_at = new Date()
        }

        // Medusa V2 generated update metodu ARRAY formu ister: updatePosts([{ id, ...data }]).
        // (id, data) imzası 500 veriyordu.
        const updated = await (content as any).updatePosts([{ id, ...updateData }])
        const post = Array.isArray(updated) ? updated[0] : updated
        return res.json({
            post,
            message: data.status === "published" ? "Yazı yayınlandı" : "Yazı güncellendi",
        })
    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: "Geçersiz istek", details: error.issues })
        }
        const msg = errMsg(error)
        logger.error(`[Content Engine API] Error updating post: ${msg}`)
        if (msg.toLowerCase().includes("unique")) {
            return res.status(409).json({ error: "Bu slug ile başka bir yazı var." })
        }
        return res.status(500).json({ error: "Yazı güncellenemedi" })
    }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
    try {
        const content = req.scope.resolve(MODULES.CONTENT_ENGINE) as unknown as IContentEngineService
        const { id } = req.params
        await (content as any).deletePosts(id)
        return res.json({ success: true, id })
    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any
        logger.error(`[Content Engine API] Error deleting post: ${errMsg(error)}`)
        return res.status(500).json({ error: "Yazı silinemedi" })
    }
}
