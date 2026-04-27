import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MODULES, IContentEngineService, CreatePostInput, UpdatePostInput, ListPostsFilters } from "../../../types/index"
import { z } from "zod"

const PostStatusSchema = z.enum(["draft", "published", "archived"])

const CreatePostSchema = z.object({
    title: z.string().min(1),
    slug: z.string().min(1),
    content: z.string().min(1),
    image: z.string().optional().nullable(),
    metadata: z.record(z.unknown()).optional().nullable(),
    status: PostStatusSchema.optional(),
    author: z.string().optional().nullable(),
    excerpt: z.string().optional().nullable(),
    seo_title: z.string().optional().nullable(),
    seo_description: z.string().optional().nullable(),
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
    metadata: z.record(z.unknown()).optional().nullable(),
})

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
        const contentEngineService = req.scope.resolve(MODULES.CONTENT_ENGINE) as IContentEngineService
        const logger = req.scope.resolve("logger") as any

        const { title, slug, content, image, metadata, status, author, excerpt, seo_title, seo_description } =
            CreatePostSchema.parse(req.body)

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
        })

        return res.status(201).json({ post })

    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: "Geçersiz istek",
                details: error.errors,
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
        const contentEngineService = req.scope.resolve(MODULES.CONTENT_ENGINE) as IContentEngineService
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
                details: error.errors,
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
        const contentEngineService = req.scope.resolve(MODULES.CONTENT_ENGINE) as IContentEngineService
        const { id, status, title, content, image, metadata } = UpdatePostSchema.parse(req.body)

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

        // Update post
        const post = await contentEngineService.updatePosts(id, updateData)

        return res.json({
            post,
            message: status === "published" ? "Post published successfully" : "Post updated successfully"
        })

    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: "Geçersiz istek",
                details: error.errors,
            })
        }

        logger.error(`[Content Engine API] Error updating post: ${getErrorMessage(error)}`)

        return res.status(500).json({
            error: "Failed to update post",
        })
    }
}
