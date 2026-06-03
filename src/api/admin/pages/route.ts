import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { ContentEngineService } from "../../../modules/content_engine"

const PageCreateSchema = z.object({
    title: z.string().min(1, "Title is required"),
    slug: z.string().min(1, "Slug is required"),
    content: z.string().optional().default(""),
    seo_title: z.string().optional(),
    seo_description: z.string().optional(),
    status: z.enum(["draft", "published", "archived"]).optional().default("draft")
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const service: ContentEngineService = req.scope.resolve("content_engine")
    
    // In Medusa v2 MedusaService auto-generates listAndCount[ModelName]s
    // Since our model is 'page', the method is listAndCountPages
    const [pages, count] = await service.listAndCountPages({}, {
        select: ["id", "title", "slug", "status", "view_count", "created_at", "updated_at"]
    })

    res.json({
        pages,
        count,
        limit: 100,
        offset: 0
    })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    const validated = PageCreateSchema.parse(req.body)
    
    const service: ContentEngineService = req.scope.resolve("content_engine")
    
    // Auto-generated create[ModelName]s
    const [page] = await service.createPages([validated])
    
    res.status(201).json({ page })
}
