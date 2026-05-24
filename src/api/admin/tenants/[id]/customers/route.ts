/**
 * Admin Tenant Customers Route — Mağaza Müşterileri Yönetimi
 *
 * GET  /admin/tenants/:id/customers → Mağazanın müşterilerini listele
 * POST /admin/tenants/:id/customers → Müşteriyi mağazaya bağla
 *
 * Auth: Admin JWT zorunlu
 * Validation: Zod
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { TENANT_MODULE } from "../../../../../modules/tenant"
import type TenantService from "../../../../../modules/tenant/service"

const LinkCustomerSchema = z.object({
    customer_id: z.string().min(1, "Müşteri ID'si zorunludur."),
})

const ListQuerySchema = z.object({
    limit: z.coerce.number().min(1).max(100).optional().default(20),
    offset: z.coerce.number().min(0).optional().default(0),
})

/**
 * GET /admin/tenants/:id/customers
 * Mağazaya kayıtlı müşterileri listeler.
 */
export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    try {
        const { id: tenantId } = req.params
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant ID zorunludur." })
        }

        const tenantService = req.scope.resolve(TENANT_MODULE) as TenantService
        const tenantResult = await tenantService.get(tenantId)
        if (!tenantResult.success) {
            return res.status(404).json({ error: tenantResult.message })
        }

        const parsed = ListQuerySchema.parse(req.query)
        const query = req.scope.resolve("remoteQuery") as any

        const { data: customers } = await query({
            entity: "customer",
            fields: [
                "id",
                "email",
                "first_name",
                "last_name",
                "has_account",
                "created_at",
            ],
            filters: {
                tenant: {
                    tenant_id: tenantId,
                },
            },
            pagination: {
                take: parsed.limit,
                skip: parsed.offset,
            },
        })

        return res.json({
            customers: customers || [],
            count: customers?.length || 0,
            tenant: tenantResult.data,
        })

    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: "Geçersiz sorgu.", details: error.issues })
        }
        logger.error(`[Tenant Customers] Listeleme hatası: ${error instanceof Error ? error.message : "Bilinmeyen"}`)
        return res.status(500).json({ error: "Mağaza müşterileri listelenirken hata oluştu." })
    }
}

/**
 * POST /admin/tenants/:id/customers
 * Mevcut bir müşteriyi mağazaya bağlar.
 * Body: { customer_id: string }
 */
export const POST = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    try {
        const { id: tenantId } = req.params
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant ID zorunludur." })
        }

        const data = LinkCustomerSchema.parse(req.body)

        const tenantService = req.scope.resolve(TENANT_MODULE) as TenantService
        const tenantResult = await tenantService.get(tenantId)
        if (!tenantResult.success) {
            return res.status(404).json({ error: tenantResult.message })
        }

        const { linkCustomerToTenantWorkflow } = await import(
            "../../../../../workflows/link-entity-to-tenant"
        )

        const result = await linkCustomerToTenantWorkflow(req.scope).run({
            input: {
                tenant_id: tenantId,
                customer_id: data.customer_id,
            },
        })

        return res.status(201).json({
            message: `Müşteri ${data.customer_id} mağazaya başarıyla bağlandı.`,
            link: result.result,
        })

    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: "Geçersiz istek.", details: error.issues })
        }
        logger.error(`[Tenant Customers] Bağlama hatası: ${error instanceof Error ? error.message : "Bilinmeyen"}`)
        return res.status(500).json({ error: "Müşteri mağazaya bağlanırken hata oluştu." })
    }
}
