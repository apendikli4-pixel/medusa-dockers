/**
 * Tenant Link Workflow'ları — Entity'leri Mağazalara Bağlama
 *
 * Bu workflow'lar Medusa v2'nin remoteLink mekanizması ile
 * ürün, sipariş ve müşteri entity'lerini tenant'lara bağlar.
 *
 * Saga pattern: Her step bir compensation fonksiyonu içerir.
 * Link oluşturma başarısız olursa otomatik geri alınır.
 *
 * Kullanım:
 * - Admin ürün oluşturduğunda → linkProductToTenantWorkflow
 * - Sipariş verildiğinde → linkOrderToTenantWorkflow
 * - Müşteri kayıt olduğunda → linkCustomerToTenantWorkflow
 */
import {
    createWorkflow,
    createStep,
    StepResponse,
    WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { TENANT_MODULE } from "../modules/tenant"

// ─── TİP TANIMLARI ───

type LinkProductInput = {
    tenant_id: string
    product_id: string
}

type LinkOrderInput = {
    tenant_id: string
    order_id: string
}

type LinkCustomerInput = {
    tenant_id: string
    customer_id: string
}

// ═══════════════════════════════════════════════════════════════
// 1. ÜRÜN → TENANT BAĞLAMA WORKFLOW'U
// ═══════════════════════════════════════════════════════════════

/**
 * Tenant'ın var ve aktif olduğunu doğrular.
 * Sahte veya pasif bir tenant'a link oluşturulmasını engeller.
 */
const validateTenantStep = createStep(
    "validate-tenant-for-link",
    async (input: { tenant_id: string }, { container }) => {
        const tenantService = container.resolve(TENANT_MODULE) as any
        const tenant = await tenantService.retrieveTenant(input.tenant_id)

        if (!tenant) {
            throw new Error(`Tenant bulunamadı: ${input.tenant_id}`)
        }
        if (!tenant.is_active) {
            throw new Error(`Tenant pasif durumda: ${tenant.name} (${input.tenant_id})`)
        }

        return new StepResponse(tenant)
    }
)

/**
 * Ürünü tenant'a bağlar. Compensation: link'i kaldırır.
 */
const linkProductStep = createStep(
    "link-product-to-tenant-step",
    async (input: LinkProductInput, { container }) => {
        const remoteLink = container.resolve("remoteLink") as any
        const logger = container.resolve("logger") as any

        await remoteLink.create({
            [TENANT_MODULE]: { tenant_id: input.tenant_id },
            [Modules.PRODUCT]: { product_id: input.product_id },
        })

        logger.info(
            `[Tenant Link] Ürün ${input.product_id} → Tenant ${input.tenant_id} bağlandı.`
        )

        return new StepResponse(
            { tenant_id: input.tenant_id, product_id: input.product_id },
            { tenant_id: input.tenant_id, product_id: input.product_id }
        )
    },
    async (linkData, { container }) => {
        if (!linkData) return
        const remoteLink = container.resolve("remoteLink") as any
        const logger = container.resolve("logger") as any

        try {
            await remoteLink.dismiss({
                [TENANT_MODULE]: { tenant_id: linkData.tenant_id },
                [Modules.PRODUCT]: { product_id: linkData.product_id },
            })
            logger.warn(
                `[Tenant Link] Compensation: Ürün ${linkData.product_id} → Tenant ${linkData.tenant_id} link'i geri alındı.`
            )
        } catch (err) {
            logger.error(`[Tenant Link] Compensation başarısız: ${err}`)
        }
    }
)

/**
 * Ürünü bir mağazaya bağlayan workflow.
 * Admin panelinden ürün oluşturma/atama sırasında çağrılır.
 */
export const linkProductToTenantWorkflow = createWorkflow(
    "link-product-to-tenant",
    (input: LinkProductInput) => {
        validateTenantStep({ tenant_id: input.tenant_id })
        const result = linkProductStep(input)
        return new WorkflowResponse(result)
    }
)

// ═══════════════════════════════════════════════════════════════
// 2. SİPARİŞ → TENANT BAĞLAMA WORKFLOW'U
// ═══════════════════════════════════════════════════════════════

/**
 * Siparişi tenant'a bağlar. Compensation: link'i kaldırır.
 */
const linkOrderStep = createStep(
    "link-order-to-tenant-step",
    async (input: LinkOrderInput, { container }) => {
        const remoteLink = container.resolve("remoteLink") as any
        const logger = container.resolve("logger") as any

        await remoteLink.create({
            [TENANT_MODULE]: { tenant_id: input.tenant_id },
            [Modules.ORDER]: { order_id: input.order_id },
        })

        logger.info(
            `[Tenant Link] Sipariş ${input.order_id} → Tenant ${input.tenant_id} bağlandı.`
        )

        return new StepResponse(
            { tenant_id: input.tenant_id, order_id: input.order_id },
            { tenant_id: input.tenant_id, order_id: input.order_id }
        )
    },
    async (linkData, { container }) => {
        if (!linkData) return
        const remoteLink = container.resolve("remoteLink") as any
        const logger = container.resolve("logger") as any

        try {
            await remoteLink.dismiss({
                [TENANT_MODULE]: { tenant_id: linkData.tenant_id },
                [Modules.ORDER]: { order_id: linkData.order_id },
            })
            logger.warn(
                `[Tenant Link] Compensation: Sipariş ${linkData.order_id} → Tenant ${linkData.tenant_id} link'i geri alındı.`
            )
        } catch (err) {
            logger.error(`[Tenant Link] Compensation başarısız: ${err}`)
        }
    }
)

/**
 * Siparişi bir mağazaya bağlayan workflow.
 * order.placed subscriber'ı tarafından otomatik çağrılır.
 */
export const linkOrderToTenantWorkflow = createWorkflow(
    "link-order-to-tenant",
    (input: LinkOrderInput) => {
        validateTenantStep({ tenant_id: input.tenant_id })
        const result = linkOrderStep(input)
        return new WorkflowResponse(result)
    }
)

// ═══════════════════════════════════════════════════════════════
// 3. MÜŞTERİ → TENANT BAĞLAMA WORKFLOW'U
// ═══════════════════════════════════════════════════════════════

/**
 * Müşteriyi tenant'a bağlar. Compensation: link'i kaldırır.
 * Many-to-many: Bir müşteri birden fazla mağazaya bağlanabilir.
 */
const linkCustomerStep = createStep(
    "link-customer-to-tenant-step",
    async (input: LinkCustomerInput, { container }) => {
        const remoteLink = container.resolve("remoteLink") as any
        const logger = container.resolve("logger") as any

        await remoteLink.create({
            [TENANT_MODULE]: { tenant_id: input.tenant_id },
            [Modules.CUSTOMER]: { customer_id: input.customer_id },
        })

        logger.info(
            `[Tenant Link] Müşteri ${input.customer_id} → Tenant ${input.tenant_id} bağlandı.`
        )

        return new StepResponse(
            { tenant_id: input.tenant_id, customer_id: input.customer_id },
            { tenant_id: input.tenant_id, customer_id: input.customer_id }
        )
    },
    async (linkData, { container }) => {
        if (!linkData) return
        const remoteLink = container.resolve("remoteLink") as any
        const logger = container.resolve("logger") as any

        try {
            await remoteLink.dismiss({
                [TENANT_MODULE]: { tenant_id: linkData.tenant_id },
                [Modules.CUSTOMER]: { customer_id: linkData.customer_id },
            })
            logger.warn(
                `[Tenant Link] Compensation: Müşteri ${linkData.customer_id} → Tenant ${linkData.tenant_id} link'i geri alındı.`
            )
        } catch (err) {
            logger.error(`[Tenant Link] Compensation başarısız: ${err}`)
        }
    }
)

/**
 * Müşteriyi bir mağazaya bağlayan workflow.
 * customer.created subscriber'ı tarafından otomatik çağrılır.
 */
export const linkCustomerToTenantWorkflow = createWorkflow(
    "link-customer-to-tenant",
    (input: LinkCustomerInput) => {
        validateTenantStep({ tenant_id: input.tenant_id })
        const result = linkCustomerStep(input)
        return new WorkflowResponse(result)
    }
)
