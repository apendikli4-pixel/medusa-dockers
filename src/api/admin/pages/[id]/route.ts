import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { ContentEngineService } from "../../../../modules/content_engine"
import { MedusaError } from "@medusajs/framework/utils"

const PageUpdateSchema = z.object({
    title: z.string().optional(),
    slug: z.string().optional(),
    content: z.string().optional(),
    seo_title: z.string().optional(),
    seo_description: z.string().optional(),
    status: z.enum(["draft", "published", "archived"]).optional(),
    // Çoklu mağaza: sayfayı başka bir mağazaya taşımak için.
    tenant_id: z.string().optional().nullable(),
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const { id } = req.params
    const service: ContentEngineService = req.scope.resolve("content_engine")
    
    const page = await service.retrievePage(id)
    if (!page) {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, "Page not found")
    }

    res.json({ page })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    const { id } = req.params
    const validated = PageUpdateSchema.parse(req.body)
    
    const service: ContentEngineService = req.scope.resolve("content_engine")
    
    const [page] = await service.updatePages([
        {
            id,
            ...validated
        }
    ])
    
    res.json({ page })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
    const { id } = req.params
    const service: ContentEngineService = req.scope.resolve("content_engine")
    
    await service.deletePages([id])
    
    res.json({
        id,
        object: "page",
        deleted: true
    })
}
