/**
 * seed-production.ts — Sıfır veritabanını canlıya hazır hale getirir (idempotent).
 *
 * Çalıştırma (sunucuda Coolify container'ında):
 *   docker exec <medusa-server> npx medusa exec ./src/scripts/seed-production.ts
 *
 * Kurar:
 *   1. Stock Location (Ana Depo)
 *   2. Sales Channel (Default)
 *   3. Region (Türkiye, TRY)
 *   4. Publishable API Key + Sales Channel link
 *   5. Tenant (Aqua Havuz, retail) — varsa atlar
 *   6. Kategoriler (Filtreleme, Kimyasallar, Temizlik)
 *   7. Shipping Profile + Fulfillment Set + Service Zone + Kargo seçenekleri
 *   8. Demo ürünler (3 adet, fiyatlı, kategorili, sales channel'a bağlı)
 *
 * Her adım "zaten var mı" kontrolü yapar → tekrar çalıştırılabilir.
 * Sonunda PUBLISHABLE_KEY'i loglar (storefront env'ine yazılacak).
 */
import { ExecArgs } from "@medusajs/framework/types"
import {
    ContainerRegistrationKeys,
    Modules,
    ProductStatus,
} from "@medusajs/framework/utils"
import {
    createRegionsWorkflow,
    createSalesChannelsWorkflow,
    createApiKeysWorkflow,
    linkSalesChannelsToApiKeyWorkflow,
    createStockLocationsWorkflow,
    linkSalesChannelsToStockLocationWorkflow,
    createProductCategoriesWorkflow,
    createProductsWorkflow,
    createShippingProfilesWorkflow,
    createServiceZonesWorkflow,
    createShippingOptionsWorkflow,
    createInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows"

export default async function seedProduction({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const link = container.resolve(ContainerRegistrationKeys.LINK)
    const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
    const apiKeyModule = container.resolve(Modules.API_KEY)
    const regionModule = container.resolve(Modules.REGION)
    const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
    const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
    const productModule = container.resolve(Modules.PRODUCT)

    logger.info("🌱 [seed-production] Başlıyor...")

    // ─── 1. Stock Location ───
    let [locations] = await stockLocationModule.listAndCountStockLocations({})
    let stockLocation = locations[0]
    if (!stockLocation) {
        const { result } = await createStockLocationsWorkflow(container).run({
            input: { locations: [{ name: "Ana Depo", address: { address_1: "Merkez", city: "İstanbul", country_code: "tr", postal_code: "34000" } }] },
        })
        stockLocation = result[0]
        logger.info(`✅ Stock location: ${stockLocation.id}`)
    } else {
        logger.info(`✅ Stock location (mevcut): ${stockLocation.id}`)
    }

    // ─── 2. Sales Channel ───
    let [channels] = await salesChannelModule.listAndCountSalesChannels({})
    let salesChannel = channels.find((c: any) => c.name === "Default Sales Channel") || channels[0]
    if (!salesChannel) {
        const { result } = await createSalesChannelsWorkflow(container).run({
            input: { salesChannelsData: [{ name: "Default Sales Channel" }] },
        })
        salesChannel = result[0]
        logger.info(`✅ Sales channel: ${salesChannel.id}`)
    } else {
        logger.info(`✅ Sales channel (mevcut): ${salesChannel.id}`)
    }

    // SC ↔ Stock Location link
    try {
        await linkSalesChannelsToStockLocationWorkflow(container).run({
            input: { id: stockLocation.id, add: [salesChannel.id] },
        })
    } catch (e: any) { logger.info(`ℹ️ SC-StockLoc link: ${e.message}`) }

    // ─── 3. Region (Türkiye, TRY) ───
    let [regions] = await regionModule.listAndCountRegions({})
    let region = regions.find((r: any) => r.currency_code === "try") || regions[0]
    if (!region) {
        const { result } = await createRegionsWorkflow(container).run({
            input: { regions: [{ name: "Türkiye", currency_code: "try", countries: ["tr"], payment_providers: ["pp_system_default"] }] },
        })
        region = result[0]
        logger.info(`✅ Region: ${region.id}`)
    } else {
        logger.info(`✅ Region (mevcut): ${region.name} ${region.id}`)
    }

    // ─── 4. Publishable API Key + SC link ───
    let [keys] = await apiKeyModule.listAndCountApiKeys({ type: "publishable" })
    let pubKey = keys[0]
    if (!pubKey) {
        const { result } = await createApiKeysWorkflow(container).run({
            input: { api_keys: [{ title: "Storefront", type: "publishable", created_by: "seed" }] },
        })
        pubKey = result[0]
        logger.info(`✅ Publishable key: ${pubKey.token}`)
    } else {
        logger.info(`✅ Publishable key (mevcut): ${pubKey.token}`)
    }
    try {
        await linkSalesChannelsToApiKeyWorkflow(container).run({
            input: { id: pubKey.id, add: [salesChannel.id] },
        })
        logger.info("✅ Key ↔ Sales Channel bağlandı")
    } catch (e: any) { logger.info(`ℹ️ Key-SC link: ${e.message}`) }

    // ─── 5. Shipping Profile ───
    const { data: profiles } = await query.graph({ entity: "shipping_profile", fields: ["id", "name"] })
    let shippingProfileId = profiles[0]?.id
    if (!shippingProfileId) {
        const { result } = await createShippingProfilesWorkflow(container).run({
            input: { data: [{ name: "Default", type: "default" }] },
        })
        shippingProfileId = result[0].id
        logger.info(`✅ Shipping profile: ${shippingProfileId}`)
    } else {
        logger.info(`✅ Shipping profile (mevcut): ${shippingProfileId}`)
    }

    // ─── 6. Fulfillment Set + Service Zone + Kargo ───
    const { data: fsets } = await query.graph({ entity: "fulfillment_set", fields: ["id", "service_zones.id"] })
    let serviceZoneId = fsets[0]?.service_zones?.[0]?.id
    let fulfillmentSetId = fsets[0]?.id
    if (!fulfillmentSetId) {
        const created = await fulfillmentModule.createFulfillmentSets({ name: "Genesis Teslimat", type: "shipping" })
        fulfillmentSetId = (Array.isArray(created) ? created[0] : created).id
    }
    if (!serviceZoneId) {
        const { result: zones } = await createServiceZonesWorkflow(container).run({
            input: { data: [{ name: "Türkiye Bölgesi", fulfillment_set_id: fulfillmentSetId, geo_zones: [{ country_code: "tr", type: "country" as const }] }] },
        })
        serviceZoneId = zones[0].id
        logger.info(`✅ Service zone: ${serviceZoneId}`)
    }
    // Linkler
    for (const [a, b] of [
        [{ [Modules.REGION]: { region_id: region.id } }, { [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSetId } }],
        [{ [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id } }, { [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSetId } }],
        [{ [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id } }, { [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual-fulfillment" } }],
    ] as any[]) {
        try { await link.create({ ...a, ...b }) } catch (e: any) { /* zaten var */ }
    }
    // Kargo seçenekleri
    const { data: existingOpts } = await query.graph({ entity: "shipping_option", fields: ["id"] })
    if (!existingOpts.length) {
        await createShippingOptionsWorkflow(container).run({
            input: [
                { name: "Standart Kargo", price_type: "flat", provider_id: "manual_manual-fulfillment", service_zone_id: serviceZoneId!, shipping_profile_id: shippingProfileId, type: { label: "Standart", description: "1-3 iş günü", code: "standard" }, prices: [{ currency_code: "try", amount: 49.9 }], rules: [{ attribute: "enabled_in_store", value: "true", operator: "eq" }, { attribute: "is_return", value: "false", operator: "eq" }] },
                { name: "Ücretsiz Kargo", price_type: "flat", provider_id: "manual_manual-fulfillment", service_zone_id: serviceZoneId!, shipping_profile_id: shippingProfileId, type: { label: "Ücretsiz", description: "500₺ üzeri", code: "free" }, prices: [{ currency_code: "try", amount: 0 }], rules: [{ attribute: "enabled_in_store", value: "true", operator: "eq" }, { attribute: "is_return", value: "false", operator: "eq" }] },
            ],
        })
        logger.info("✅ Kargo seçenekleri oluşturuldu")
    } else {
        logger.info(`✅ Kargo (mevcut): ${existingOpts.length} seçenek`)
    }

    // ─── 7. Kategoriler ───
    const { data: existingCats } = await query.graph({ entity: "product_category", fields: ["id", "name"] })
    let categories: any[] = existingCats
    if (!existingCats.length) {
        const { result } = await createProductCategoriesWorkflow(container).run({
            input: { product_categories: [
                { name: "Filtreleme", is_active: true },
                { name: "Kimyasallar", is_active: true },
                { name: "Temizlik Ekipmanları", is_active: true },
            ] },
        })
        categories = result as any[]
        logger.info(`✅ ${result.length} kategori oluşturuldu`)
    } else {
        logger.info(`✅ Kategoriler (mevcut): ${existingCats.length}`)
    }
    const catId = (name: string) => categories.find((c: any) => c.name === name)?.id

    // ─── 8. Demo ürünler ───
    const { data: existingProds } = await query.graph({ entity: "product", fields: ["id"] })
    if (!existingProds.length) {
        await createProductsWorkflow(container).run({
            input: { products: [
                {
                    title: "Aqua Havuz Filtresi 5L", handle: "aqua-havuz-filtresi", status: ProductStatus.PUBLISHED,
                    description: "Yüksek kapasiteli havuz filtreleme sistemi. Berrak su için ideal.",
                    category_ids: [catId("Filtreleme")].filter(Boolean) as string[],
                    shipping_profile_id: shippingProfileId,
                    options: [{ title: "Boyut", values: ["Standart"] }],
                    variants: [{ title: "Standart", options: { Boyut: "Standart" }, manage_inventory: false, prices: [{ amount: 20000, currency_code: "try" }] }],
                    sales_channels: [{ id: salesChannel.id }],
                },
                {
                    title: "Klor Tableti 1kg", handle: "klor-tablet", status: ProductStatus.PUBLISHED,
                    description: "Havuz suyu dezenfeksiyonu için yavaş çözünen klor tableti.",
                    category_ids: [catId("Kimyasallar")].filter(Boolean) as string[],
                    shipping_profile_id: shippingProfileId,
                    options: [{ title: "Boyut", values: ["1kg"] }],
                    variants: [{ title: "1kg", options: { Boyut: "1kg" }, manage_inventory: false, prices: [{ amount: 1400, currency_code: "try" }] }],
                    sales_channels: [{ id: salesChannel.id }],
                },
                {
                    title: "Havuz Temizlik Robotu", handle: "havuz-robotu", status: ProductStatus.PUBLISHED,
                    description: "Otomatik havuz dibi temizlik robotu. Zahmetsiz bakım.",
                    category_ids: [catId("Temizlik Ekipmanları")].filter(Boolean) as string[],
                    shipping_profile_id: shippingProfileId,
                    options: [{ title: "Model", values: ["Pro"] }],
                    variants: [{ title: "Pro", options: { Model: "Pro" }, manage_inventory: false, prices: [{ amount: 74000, currency_code: "try" }] }],
                    sales_channels: [{ id: salesChannel.id }],
                },
            ] },
        })
        logger.info("✅ 3 demo ürün oluşturuldu")
    } else {
        logger.info(`✅ Ürünler (mevcut): ${existingProds.length}`)
    }

    logger.info("═══════════════════════════════════════════")
    logger.info(`🎉 [seed-production] TAMAMLANDI`)
    logger.info(`📋 PUBLISHABLE_KEY = ${pubKey.token}`)
    logger.info(`   (Bu key'i storefront PUBLISHABLE_API_KEY env'ine yaz)`)
    logger.info("═══════════════════════════════════════════")
}
