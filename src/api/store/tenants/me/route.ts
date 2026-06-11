/**
 * GET /store/tenants/me
 *
 * Mevcut isteğe çözümlenen tenant bilgisini storefront'a açan public endpoint.
 *
 * Storefront, kullanıcı domain/slug üzerinden hangi mağazaya bağlandığını
 * bu endpoint üzerinden öğrenir. Dönen sektör ve tema bilgisi ile
 * arayüzü dinamik olarak adapte eder.
 *
 * Auth: gerekmiyor (publishable API key zaten middleware tarafından enjekte edilir
 * ve tenant context çözümlenmişse erişim güvenli sayılır).
 *
 * Yanıt:
 *   {
 *     tenant: {
 *       id, slug, name, sector,
 *       theme: { primaryColor?, secondaryColor?, logo? },
 *       contact: { phone?, email?, address? },
 *       features: string[]
 *     }
 *   }
 *
 * Hata: tenant context yoksa 404 (middleware fail-closed çalıştıysa zaten
 * 400 dönmüş olur — bu noktaya gelmiş olmamız gerekir).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const ctx = req.tenantContext
    if (!ctx) {
        return res.status(404).json({
            error: "Tenant context not resolved.",
            code: "TENANT_NOT_RESOLVED",
        })
    }

    // Tam tenant kaydını ayrıntılarla beraber çek (settings, features)
    let full: any = null
    try {
        const tenantService = req.scope.resolve("tenant") as any
        full = await tenantService.retrieveTenant(ctx.tenant_id)
    } catch {
        // Settings'i alamasak da minimum bilgiyi yansıt
    }

    const settings = (full?.settings ?? {}) as Record<string, unknown>
    const theme = (settings.theme ?? {}) as Record<string, string>
    const contact = (settings.contact ?? {}) as Record<string, string>
    const storefront = (settings.storefront ?? {}) as Record<string, any>

    // Tenant'ın kendi publishable key'i — storefront, doğru mağazanın ürünlerini
    // çekmek için bunu kullanır (çoklu mağaza izolasyonu). Publishable key güvenlidir
    // (zaten tarayıcıya açıktır), bu yüzden public endpoint'te döndürmek sakıncasız.
    let publishableKey: string | null = null
    try {
        const remoteQuery = req.scope.resolve("remoteQuery") as any
        const { data } = await remoteQuery.graph({
            entity: "tenant",
            fields: ["api_key.token"],
            filters: { id: ctx.tenant_id },
        })
        publishableKey = data?.[0]?.api_key?.token ?? null
    } catch { /* yoksa null → storefront env key'ine düşer */ }

    return res.json({
        tenant: {
            id: ctx.tenant_id,
            slug: ctx.slug,
            name: ctx.name,
            sector: ctx.sector,
            publishableKey,
            theme: {
                primaryColor: theme.primaryColor ?? null,
                secondaryColor: theme.secondaryColor ?? null,
                logo: theme.logo ?? null,
            },
            contact: {
                phone: contact.phone ?? null,
                email: contact.email ?? null,
                address: contact.address ?? null,
            },
            // StoreConfig (bkz. src/modules/tenant/store-config.ts).
            // GÜVENLİK: email.* alanları (IBAN, gönderici) bilinçli olarak DÖNDÜRÜLMEZ —
            // public endpoint'tir; o alanları yalnızca backend (subscriber/provider) okur.
            storefront: {
                contact: storefront.contact ?? null,
                socials: storefront.socials ?? null,
                links: storefront.links ?? null,
                heroImage: storefront.heroImage ?? null,
                branding: storefront.branding ?? null,
                seo: storefront.seo ?? null,
                ai: storefront.ai ? { greeting: storefront.ai.greeting ?? null } : null,
                ageGate: storefront.ageGate ?? null,
                commerce: storefront.commerce ?? null,
                footer: storefront.footer ?? null,
            },
            features: Array.isArray(full?.features) ? (full!.features as string[]) : [],
        },
    })
}
