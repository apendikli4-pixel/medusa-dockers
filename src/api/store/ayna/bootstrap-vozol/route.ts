import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
    createSalesChannelsWorkflow,
    createApiKeysWorkflow,
    linkSalesChannelsToApiKeyWorkflow,
    linkSalesChannelsToStockLocationWorkflow,
    createProductCategoriesWorkflow,
    createProductsWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * GEÇİCİ — Vozol (vape) mağazası bootstrap'i.
 * Yeni tenant + sales channel + publishable key + kategori + Vozol ürünleri (placeholder)
 * oluşturur ve tenant'a bağlar. İdempotent (slug "vozol" varsa tekrar oluşturmaz).
 * Gizli anahtarla korunur. KURULUM SONRASI BU DOSYA SİLİNECEK.
 */

const SECRET = "BOOT_VOZOL_2026_xK9mQ2vL7pR4tZ"

// Vozol popüler modelleri (placeholder — fiyat YOK; kullanıcı admin'den girer).
const VOZOL_PRODUCTS = [
    { title: "Vozol Gear 10000", handle: "vozol-gear-10000", desc: "Vozol Gear 10000 puff kullan-at elektronik sigara. (Fiyat admin'den girilecek.)" },
    { title: "Vozol Gear 20000", handle: "vozol-gear-20000", desc: "Vozol Gear 20000 puff kullan-at elektronik sigara. (Fiyat admin'den girilecek.)" },
    { title: "Vozol Star 12000", handle: "vozol-star-12000", desc: "Vozol Star 12000 puff kullan-at elektronik sigara. (Fiyat admin'den girilecek.)" },
    { title: "Vozol Vista 20000", handle: "vozol-vista-20000", desc: "Vozol Vista 20000 puff kullan-at elektronik sigara. (Fiyat admin'den girilecek.)" },
    { title: "Vozol Neon 10000", handle: "vozol-neon-10000", desc: "Vozol Neon 10000 puff kullan-at elektronik sigara. (Fiyat admin'den girilecek.)" },
]

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const body = (req.body || {}) as any
    if (body.secret !== SECRET) return res.status(403).json({ error: "forbidden" })

    const logger = req.scope.resolve("logger") as any
    const link = req.scope.resolve(ContainerRegistrationKeys.LINK) as any
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any
    const tenantService = req.scope.resolve("tenant") as any
    const salesChannelModule = req.scope.resolve(Modules.SALES_CHANNEL) as any
    const apiKeyModule = req.scope.resolve(Modules.API_KEY) as any
    const regionModule = req.scope.resolve(Modules.REGION) as any
    const stockLocationModule = req.scope.resolve(Modules.STOCK_LOCATION) as any

    const out: any = { steps: [] }
    try {
        // 0) İdempotenti: tenant "vozol" zaten var mı?
        const existing = await tenantService.listTenants({ slug: "vozol" }).catch(() => [])
        if (existing && existing.length > 0) {
            return res.status(200).json({ alreadyExists: true, tenant: existing[0] })
        }

        // 1) Sales channel
        let [channels] = await salesChannelModule.listAndCountSalesChannels({ name: "Vozol Vape" })
        let channel = channels?.[0]
        if (!channel) {
            const { result } = await createSalesChannelsWorkflow(req.scope).run({
                input: { salesChannelsData: [{ name: "Vozol Vape", description: "Vozol kullan-at e-sigara mağazası" }] },
            })
            channel = result[0]
        }
        out.steps.push("sales_channel:" + channel.id)

        // 2) Region (mevcut TRY'yi kullan)
        const regions = await regionModule.listRegions({})
        const region = regions.find((r: any) => r.currency_code === "try") || regions[0]
        out.steps.push("region:" + (region?.id || "YOK"))

        // 3) Stock location (mevcut ilk lokasyon) + kanala bağla
        const locations = await stockLocationModule.listStockLocations({})
        const stockLocation = locations?.[0]
        if (stockLocation) {
            await linkSalesChannelsToStockLocationWorkflow(req.scope).run({
                input: { id: stockLocation.id, add: [channel.id] },
            }).catch(() => { /* zaten bağlı olabilir */ })
            out.steps.push("stock_location:" + stockLocation.id)
        }

        // 4) Publishable API key + kanala bağla
        const { result: keyRes } = await createApiKeysWorkflow(req.scope).run({
            input: { api_keys: [{ title: "Vozol Storefront", type: "publishable", created_by: "system" }] },
        })
        const apiKey = keyRes[0]
        await linkSalesChannelsToApiKeyWorkflow(req.scope).run({
            input: { id: apiKey.id, add: [channel.id] },
        })
        out.steps.push("api_key:" + apiKey.id)
        out.publishableKey = apiKey.token

        // 5) Tenant kaydı (vape sektörü)
        const [tenant] = await tenantService.createTenants([{
            name: "Vozol",
            slug: "vozol",
            sector: "vape",
            is_active: true,
            settings: {
                theme: { primaryColor: "#7c3aed", secondaryColor: "#0ea5e9" },
                currency: "TRY",
                storefront: {
                    contact: { person: "", phone: "", email: "", address: "" },
                },
            },
            features: ["age_gate"],
        }])
        out.steps.push("tenant:" + tenant.id)

        // 6) Tenant ↔ (sales_channel, api_key, stock_location) link'leri
        await link.create({ tenant: { tenant_id: tenant.id }, sales_channel: { sales_channel_id: channel.id } }).catch(() => {})
        await link.create({ tenant: { tenant_id: tenant.id }, api_key: { api_key_id: apiKey.id } }).catch(() => {})
        if (stockLocation) {
            await link.create({ tenant: { tenant_id: tenant.id }, stock_location: { stock_location_id: stockLocation.id } }).catch(() => {})
        }
        out.steps.push("links:ok")

        // 7) Kategori
        let category: any
        try {
            const { result: catRes } = await createProductCategoriesWorkflow(req.scope).run({
                input: { product_categories: [{ name: "Kullan-At Elektronik Sigara", is_active: true }] },
            })
            category = catRes[0]
        } catch { /* varsa geç */ }

        // Shipping profile (ürünlerin satın alınabilmesi için)
        let shippingProfileId: string | undefined
        try {
            const { data: profiles } = await query.graph({ entity: "shipping_profile", fields: ["id"] })
            shippingProfileId = profiles?.[0]?.id
        } catch { /* opsiyonel */ }

        // 8) Vozol ürünleri (Vozol kanalında, FİYATSIZ placeholder, stokta)
        const productsInput = VOZOL_PRODUCTS.map((p) => ({
            title: p.title,
            handle: p.handle,
            description: p.desc,
            status: "published" as const,
            ...(category ? { category_ids: [category.id] } : {}),
            ...(shippingProfileId ? { shipping_profile_id: shippingProfileId } : {}),
            sales_channels: [{ id: channel.id }],
            options: [{ title: "Model", values: ["Standart"] }],
            variants: [{
                title: "Standart",
                sku: p.handle,
                options: { Model: "Standart" },
                manage_inventory: false,
                prices: [], // fiyat YOK — admin'den girilecek
            }],
        }))
        const { result: prodRes } = await createProductsWorkflow(req.scope).run({
            input: { products: productsInput as any },
        })
        out.steps.push("products:" + (prodRes?.length || 0))

        out.success = true
        out.tenantId = tenant.id
        out.channelId = channel.id
        return res.status(200).json(out)
    } catch (e: any) {
        logger.error(`[bootstrap-vozol] ${e?.message}`)
        return res.status(500).json({ error: String(e?.message || e), steps: out.steps })
    }
}
