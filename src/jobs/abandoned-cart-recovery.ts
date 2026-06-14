import { MedusaContainer, INotificationModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { getStoreConfig } from "../modules/tenant/store-config"
import { isAbandonedCandidate, buildReturnToCartUrl, type AbandonedCartInput } from "../lib/abandoned-cart/candidate"

/**
 * Terk Edilmiş Sepet Kurtarma — Zamanlanmış Görev
 * ════════════════════════════════════════════════
 * Sepeti dolu ama ~4 saattir siparişe dönmemiş müşterilere TEK, sade bir hatırlatma
 * e-postası gönderir (Brevo, tenant-markalı). İdempotenttir: aynı sepete iki kez gönderilmez
 * (cart.metadata.abandoned_reminder_sent_at). Çok-tenant: her sepet KENDİ mağazasının markasıyla.
 *
 * Karar mantığı saf çekirdektedir (src/lib/abandoned-cart/candidate.ts, tam test edilir);
 * bu dosya yalnızca ince orkestrasyondur. E-posta deseni `order-placed` subscriber ile aynıdır.
 */
const HOUR = 60 * 60 * 1000

export default async function abandonedCartRecoveryJob(container: MedusaContainer): Promise<void> {
    const logger = container.resolve("logger") as { info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void }
    const query = container.resolve("remoteQuery") as (cfg: Record<string, unknown>) => Promise<{ data: any[] }>
    const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)
    const cartModule = container.resolve(Modules.CART) as { updateCarts: (id: string, data: Record<string, unknown>) => Promise<unknown> }

    const minAgeMs = (Number(process.env.ABANDONED_CART_MIN_AGE_HOURS) || 4) * HOUR
    const maxAgeMs = (Number(process.env.ABANDONED_CART_MAX_AGE_HOURS) || 48) * HOUR
    const BATCH = Number(process.env.ABANDONED_CART_BATCH) || 200
    const now = Date.now()

    let candidates: any[] = []
    try {
        const { data } = await query({
            entity: "cart",
            fields: [
                "id", "email", "completed_at", "updated_at", "currency_code", "metadata",
                "items.id", "items.title", "items.quantity", "items.unit_price", "items.product_id", "items.thumbnail",
            ],
            filters: {
                completed_at: null,
                updated_at: { $gte: new Date(now - maxAgeMs), $lte: new Date(now - minAgeMs) },
            },
            pagination: { take: BATCH },
        })
        candidates = data ?? []
    } catch (e) {
        logger.error(`[AbandonedCart] Aday sepetler sorgulanamadı: ${e instanceof Error ? e.message : e}`)
        return
    }

    if (candidates.length === BATCH) {
        logger.warn(`[AbandonedCart] Batch limiti (${BATCH}) doldu — kalan sepetler bir sonraki çalışmada işlenecek.`)
    }

    let sent = 0, skipped = 0, failed = 0

    for (const cart of candidates) {
        try {
            const verdict = isAbandonedCandidate(cart as AbandonedCartInput, now, { minAgeMs, maxAgeMs })
            if (!verdict.eligible) { skipped++; continue }

            // ─── Tenant çözümleme (order-placed ile aynı: ilk ürün → tenant link) ───
            const firstProductId = cart.items?.[0]?.product_id
            if (!firstProductId) { skipped++; continue }
            const { data: productLinks } = await query({
                entity: "product",
                fields: ["tenant.tenant_id"],
                filters: { id: firstProductId },
            })
            const tenantId: string | null = productLinks?.[0]?.tenant?.tenant_id ?? null
            if (!tenantId) {
                logger.warn(`[AbandonedCart] Sepet ${cart.id}: tenant çözülemedi — yanlış markayla göndermemek için atlandı.`)
                skipped++; continue
            }

            const tenantService = container.resolve("tenant") as { retrieveTenant: (id: string) => Promise<any> }
            const tenant = await tenantService.retrieveTenant(tenantId)
            const storeConfig = getStoreConfig(tenant)

            // Şablon: mağaza config → env → atla (sahte/yanlış şablonla gönderme).
            const templateId =
                storeConfig.email?.templates?.abandonedCart ||
                process.env.BREVO_ABANDONED_CART_TEMPLATE_ID
            if (!templateId) {
                logger.warn(`[AbandonedCart] Sepet ${cart.id} (tenant ${tenantId}): abandonedCart şablonu tanımlı değil — atlandı.`)
                skipped++; continue
            }

            // Sepete dön linki: tenant domain → env STOREFRONT_BASE_URL → (yoksa link gönderilmez).
            const baseUrl: string | undefined = tenant?.domain ? `https://${tenant.domain}` : process.env.STOREFRONT_BASE_URL
            const returnUrl = baseUrl ? buildReturnToCartUrl(baseUrl, cart.id) : null

            await notificationModuleService.createNotifications({
                to: cart.email,
                channel: "email",
                template: templateId,
                data: {
                    cart_id: cart.id,
                    return_url: returnUrl,
                    item_count: cart.items?.length ?? 0,
                    items: (cart.items ?? []).map((i: any) => ({
                        title: i.title, quantity: i.quantity, unit_price: i.unit_price, thumbnail: i.thumbnail,
                    })),
                    currency_code: cart.currency_code ?? null,
                    store_name: tenant?.name ?? null,
                    // Brevo provider per-tenant göndericiyi buradan okur (settings.storefront.email.*).
                    tenant: tenant ? { settings: tenant.settings ?? {} } : null,
                },
            })

            // İdempotent işaret: tekrar gönderme.
            await cartModule.updateCarts(cart.id, {
                metadata: { ...(cart.metadata ?? {}), abandoned_reminder_sent_at: new Date(now).toISOString() },
            })

            sent++
        } catch (e) {
            failed++
            logger.error(`[AbandonedCart] Sepet ${cart?.id} işlenemedi: ${e instanceof Error ? e.message : e}`)
        }
    }

    logger.info(`[AbandonedCart] Tamamlandı. Gönderildi: ${sent}, Atlandı: ${skipped}, Hatalı: ${failed} (taranan: ${candidates.length}).`)
}

export const config = {
    name: "abandoned-cart-recovery",
    schedule: "*/30 * * * *", // her 30 dakikada bir
}
