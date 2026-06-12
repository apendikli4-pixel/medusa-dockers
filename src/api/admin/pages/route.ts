import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { ContentEngineService } from "../../../modules/content_engine"
import { resolveDefaultTenantId } from "../../../lib/default-tenant"

const PageCreateSchema = z.object({
    title: z.string().min(1, "Title is required"),
    slug: z.string().min(1, "Slug is required"),
    content: z.string().optional().default(""),
    seo_title: z.string().optional(),
    seo_description: z.string().optional(),
    status: z.enum(["draft", "published", "archived"]).optional().default("draft"),
    // Çoklu mağaza: sayfanın ait olduğu mağaza (tenant). Boşsa varsayılan mağaza.
    tenant_id: z.string().optional().nullable(),
})

/**
 * Verilen tenant_id'yi kullanır; boşsa varsayılan mağazaya düşer.
 * (Varsayılan mağaza çözümlemesi: env → slug 'default' → en eski tenant.)
 */
async function resolveTenantId(req: MedusaRequest, requested?: string | null): Promise<string | null> {
    if (requested) return requested
    return resolveDefaultTenantId(req.scope)
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const service: ContentEngineService = req.scope.resolve("content_engine")
    
    // In Medusa v2 MedusaService auto-generates listAndCount[ModelName]s
    // Since our model is 'page', the method is listAndCountPages
    const [pages, count] = await service.listAndCountPages({}, {
        select: ["id", "title", "slug", "status", "view_count", "created_at", "updated_at", "tenant_id"]
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

    // Çoklu mağaza: sayfa bir mağazaya bağlanır (boşsa varsayılan mağaza).
    const resolvedTenantId = await resolveTenantId(req, validated.tenant_id)

    // Auto-generated create[ModelName]s
    const [page] = await service.createPages([{ ...validated, tenant_id: resolvedTenantId } as any])

    res.status(201).json({ page })
}
