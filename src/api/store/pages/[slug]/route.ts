import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContentEngineService } from "../../../../modules/content_engine"
import { MedusaError } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const { slug } = req.params
    const service: ContentEngineService = req.scope.resolve("content_engine")
    
    // Çoklu mağaza: sayfa yalnızca AKTİF mağazaya (tenant) aitse görünür.
    const tenantId = (req as any).tenant_id
    const [pages] = await service.listAndCountPages({
        slug,
        status: "published",
        ...(tenantId ? { tenant_id: tenantId } : {}),
    })

    const page = pages[0]

    if (!page) {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, "Page not found")
    }

    // Optionally increment view_count asynchronously
    service.updatePages([{
        id: page.id,
        view_count: (page.view_count || 0) + 1
    }]).catch(err => req.scope.resolve("logger").error(`Failed to update page view count: ${err.message}`))

    res.json({ page })
}
