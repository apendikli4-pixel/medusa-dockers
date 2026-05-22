/**
 * Tenant Entity Linker Subscriber — Otomatik Mağaza Bağlama
 *
 * Bu subscriber, ürün ve müşteri oluşturulma olaylarını dinler
 * ve eğer işlem bir tenant bağlamında yapıldıysa (req.tenant_id mevcut),
 * ilgili entity'yi otomatik olarak o tenant'a bağlar.
 *
 * Akış:
 * 1. product.created → Ürünü oluşturan admin'in tenant_id'si varsa bağla
 * 2. customer.created → Müşteriyi kaydolan mağazanın tenant_id'si varsa bağla
 *
 * NOT: order.placed olayı ayrı bir subscriber'da (order-placed.ts) yönetilir
 * ve oradan tenant bağlama tetiklenir.
 *
 * Dürüstlük ilkesi:
 * - Tenant bağlamı yoksa bağlama yapılmaz (sessizce geçer)
 * - Her başarılı/başarısız işlem loglanır
 * - Bağlama hatası ana işlemi engellemez (fail-open)
 */
import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { TENANT_MODULE } from "../modules/tenant"

/**
 * Ürün oluşturulduğunda tenant'a bağlama handler'ı.
 *
 * Event data'da tenant_id bilgisi product metadata'sında veya
 * admin context'te bulunabilir. Bu subscriber her iki yolu da kontrol eder.
 */
export default async function tenantEntityLinkerHandler({
    event: { data, metadata },
    container,
}: SubscriberArgs<{ id: string }>) {
    const logger = container.resolve("logger") as any

    try {
        // ─── Tenant ID'yi belirle ───
        // metadata.tenant_id: Medusa v2 event metadata'sından
        // Bu değer, middleware tarafından request'e eklenen tenant_id'dir
        const tenantId = (metadata as any)?.tenant_id

        if (!tenantId) {
            // Tenant bağlamı yok — bu ürün/müşteri genel platforma ait
            // veya tenant resolver çalışmadı. Sessizce geç.
            return
        }

        // ─── Tenant'ın var ve aktif olduğunu doğrula ───
        const tenantService = container.resolve(TENANT_MODULE) as any
        let tenant: any
        try {
            tenant = await tenantService.retrieveTenant(tenantId)
        } catch {
            logger.warn(
                `[Tenant Linker] Tenant bulunamadı: ${tenantId}. ` +
                `Entity ${data.id} bağlanmadı.`
            )
            return
        }

        if (!tenant.is_active) {
            logger.warn(
                `[Tenant Linker] Tenant pasif: ${tenant.name} (${tenantId}). ` +
                `Entity ${data.id} bağlanmadı.`
            )
            return
        }

        // ─── remoteLink ile bağla ───
        const remoteLink = container.resolve("remoteLink") as any
        const eventName = (metadata as any)?.eventName || ""

        if (eventName.startsWith("product.")) {
            await remoteLink.create({
                [TENANT_MODULE]: { tenant_id: tenantId },
                product: { product_id: data.id },
            })
            logger.info(
                `[Tenant Linker] Ürün ${data.id} → Tenant "${tenant.name}" (${tenantId}) otomatik bağlandı.`
            )
        } else if (eventName.startsWith("customer.")) {
            await remoteLink.create({
                [TENANT_MODULE]: { tenant_id: tenantId },
                customer: { customer_id: data.id },
            })
            logger.info(
                `[Tenant Linker] Müşteri ${data.id} → Tenant "${tenant.name}" (${tenantId}) otomatik bağlandı.`
            )
        }

    } catch (error: unknown) {
        // ─── Fail-open: Bağlama hatası ana işlemi engellemez ───
        logger.error(
            `[Tenant Linker] Otomatik bağlama hatası (entity: ${data.id}): ` +
            `${error instanceof Error ? error.message : "Bilinmeyen hata"}`
        )
    }
}

export const config: SubscriberConfig = {
    event: ["product.created", "customer.created"],
}
