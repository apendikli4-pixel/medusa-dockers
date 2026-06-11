import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MODULES, IContentEngineService, CreatePostInput, UpdatePostInput, ListPostsFilters } from "../../../types/index"
import { TENANT_MODULE } from "../../../modules/tenant"
import { z } from "@medusajs/framework/zod"

const PostStatusSchema = z.enum(["draft", "published", "archived"])

const CreatePostSchema = z.object({
    title: z.string().min(1),
    slug: z.string().min(1),
    content: z.string().min(1),
    image: z.string().optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
    status: PostStatusSchema.optional(),
    author: z.string().optional().nullable(),
    excerpt: z.string().optional().nullable(),
    seo_title: z.string().optional().nullable(),
    seo_description: z.string().optional().nullable(),
    // Çoklu mağaza: yazının ait olduğu mağaza (tenant). Boşsa varsayılan mağaza.
    tenant_id: z.string().optional().nullable(),
})

const ListPostsQuerySchema = z.object({
    status: PostStatusSchema.optional(),
})

const UpdatePostSchema = z.object({
    id: z.string().min(1),
    status: PostStatusSchema.optional(),
    title: z.string().optional(),
    content: z.string().optional(),
    image: z.string().optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
    // Çoklu mağaza: yazıyı başka bir mağazaya taşımak için.
    tenant_id: z.string().optional().nullable(),
})

/**
 * Verilen tenant_id'yi doğrular; boşsa varsayılan mağazaya (slug='default') düşer.
 * Böylece yeni içerik HER ZAMAN bir mağazaya bağlı olur (null = hiçbir vitrinde görünmez).
 */
async function resolveTenantId(req: MedusaRequest, requested?: string | null): Promise<string | null> {
    if (requested) return requested
    try {
        const tenantService = req.scope.resolve(TENANT_MODULE) as any
        const def = await tenantService.findBySlug("default")
        return def?.id || null
    } catch {
        return null
    }
}

function isDuplicateError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
        return false
    }

    const record = error as Record<string, unknown>
    const code = typeof record.code === "string" ? record.code : ""
    const message = error instanceof Error
        ? error.message
        : (typeof record.message === "string" ? record.message : "")

    return code === "23505" || message.toLowerCase().includes("unique")
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown error"
}

export const POST = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    try {
        const contentEngineService = req.scope.resolve(MODULES.CONTENT_ENGINE) as unknown as IContentEngineService
        const logger = req.scope.resolve("logger") as any

        const { title, slug, content, image, metadata, status, author, excerpt, seo_title, seo_description, tenant_id } =
            CreatePostSchema.parse(req.body)

        // Çoklu mağaza: yazı bir mağazaya bağlanır (boşsa varsayılan mağaza).
        const resolvedTenantId = await resolveTenantId(req, tenant_id)

        // Create post
        const post = await contentEngineService.createPosts({
            title,
            slug,
            content,
            image: image || null,
            metadata: metadata || null,
            status: status || "draft",
            published_at: status === "published" ? new Date() : null,
            // SEO Fields
            author: author || null,
            excerpt: excerpt || null,
            seo_title: seo_title || null,
            seo_description: seo_description || null,
            // Çoklu mağaza
            tenant_id: resolvedTenantId,
        } as any)

        return res.status(201).json({ post })

    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: "Geçersiz istek",
                details: error.issues,
            })
        }

        logger.error(`[Content Engine API] Error creating post: ${getErrorMessage(error)}`)

        // Handle unique constraint violation (duplicate slug)
        if (isDuplicateError(error)) {
            return res.status(409).json({
                error: "A post with this slug already exists.",
            })
        }

        return res.status(500).json({
            error: "Failed to create post",
        })
    }
}

export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    try {
        const contentEngineService = req.scope.resolve(MODULES.CONTENT_ENGINE) as unknown as IContentEngineService
        const parsedQuery = ListPostsQuerySchema.parse(req.query)

        const { status } = parsedQuery

        const filters: ListPostsFilters = {}
        if (status) {
            filters.status = status
        }

        const posts = await contentEngineService.listPosts(filters, {
            order: { created_at: "DESC" }
        })

        return res.json({ posts })

    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: "Geçersiz istek",
                details: error.issues,
            })
        }

        logger.error(`[Content Engine API] Error listing posts: ${getErrorMessage(error)}`)

        return res.status(500).json({
            error: "Failed to list posts",
        })
    }
}

export const PATCH = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    try {
        const contentEngineService = req.scope.resolve(MODULES.CONTENT_ENGINE) as unknown as IContentEngineService
        const { id, status, title, content, image, metadata, tenant_id } = UpdatePostSchema.parse(req.body)

        // Prepare update data
        const updateData: UpdatePostInput = {}
        if (status) {
            updateData.status = status
            // Set published_at when publishing
            if (status === "published") {
                updateData.published_at = new Date()
            }
        }
        if (title) updateData.title = title
        if (content) updateData.content = content
        if (image !== undefined) updateData.image = image
        if (metadata) updateData.metadata = metadata
        // Çoklu mağaza: yazıyı başka mağazaya taşıma (yalnızca açıkça gönderildiğinde).
        if (tenant_id !== undefined) (updateData as any).tenant_id = tenant_id

        // Update post — Medusa V2 generated metot ARRAY formu ister ([{id,...}]).
        const updated = await contentEngineService.updatePosts([{ id, ...updateData }])
        const post = Array.isArray(updated) ? updated[0] : updated

        return res.json({
            post,
            message: status === "published" ? "Post published successfully" : "Post updated successfully"
        })

    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: "Geçersiz istek",
                details: error.issues,
            })
        }

        logger.error(`[Content Engine API] Error updating post: ${getErrorMessage(error)}`)

        return res.status(500).json({
            error: "Failed to update post",
        })
    }
}
