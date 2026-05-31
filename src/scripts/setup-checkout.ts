/**
 * setup-checkout.ts — Checkout altyapısını kuran idempotent script.
 *
 * Çalıştırma:  docker exec medusa_server_core_v2 npx medusa exec ./src/scripts/setup-checkout.ts
 *
 * Yaptıkları (hepsi idempotent — tekrar çalıştırılabilir):
 *   1. Default fulfillment set'i bul (yoksa oluştur)
 *   2. Türkiye service zone'u oluştur (yoksa) — geo_area country=tr
 *   3. Fulfillment set'i Türkiye region'ına bağla
 *   4. Fulfillment set'i stock location'a bağla
 *   5. manual fulfillment provider'ı stock location'a bağla
 *   6. Standart + Ekspres kargo seçeneklerini oluştur (yoksa)
 *
 * Tüm ID'ler dinamik keşfedilir — hardcode YOK.
 */
import { ExecArgs } from "@medusajs/framework/types"
import {
    ContainerRegistrationKeys,
    Modules,
} from "@medusajs/framework/utils"
import {
    createServiceZonesWorkflow,
    createShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows"

export default async function setupCheckout({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const remoteLink = container.resolve(ContainerRegistrationKeys.LINK)
    const fulfillmentService = container.resolve(Modules.FULFILLMENT)

    logger.info("🛒 [setup-checkout] Başlıyor...")

    // ─── 1. Region (Türkiye) ───
    const { data: regions } = await query.graph({
        entity: "region",
        fields: ["id", "name", "currency_code"],
    })
    if (!regions.length) throw new Error("Region yok! Önce seed gerekli.")
    const region = regions.find((r: any) => r.currency_code === "try") || regions[0]
    logger.info(`✅ Region: ${region.name} (${region.id})`)

    // ─── 2. Shipping Profile ───
    const { data: profiles } = await query.graph({
        entity: "shipping_profile",
        fields: ["id", "name"],
    })
    const profileId = profiles[0]?.id
    if (!profileId) throw new Error("Shipping profile yok!")
    logger.info(`✅ Shipping Profile: ${profileId}`)

    // ─── 3. Stock Location ───
    const { data: locations } = await query.graph({
        entity: "stock_location",
        fields: ["id", "name"],
    })
    const stockLocationId = locations[0]?.id
    if (!stockLocationId) throw new Error("Stock location yok!")
    logger.info(`✅ Stock Location: ${stockLocationId}`)

    // ─── 4. Fulfillment Set (manual provider'lı, yoksa oluştur) ───
    const { data: fsets } = await query.graph({
        entity: "fulfillment_set",
        fields: ["id", "name", "type", "service_zones.id", "service_zones.name"],
    })

    let fulfillmentSetId: string
    let serviceZoneId: string | undefined

    const existingSet = fsets[0]
    if (existingSet) {
        fulfillmentSetId = existingSet.id
        serviceZoneId = existingSet.service_zones?.[0]?.id
        logger.info(
            `✅ Mevcut Fulfillment Set: ${fulfillmentSetId} (zone: ${serviceZoneId || "YOK"})`
        )
    } else {
        const created = await fulfillmentService.createFulfillmentSets({
            name: "Genesis Teslimat Seti",
            type: "shipping",
        })
        const set = Array.isArray(created) ? created[0] : created
        fulfillmentSetId = set.id
        logger.info(`✅ Yeni Fulfillment Set: ${fulfillmentSetId}`)
    }

    // ─── 5. Service Zone (Türkiye) — yoksa oluştur ───
    if (!serviceZoneId) {
        const { result: zones } = await createServiceZonesWorkflow(container).run({
            input: {
                data: [
                    {
                        name: "Türkiye Bölgesi",
                        fulfillment_set_id: fulfillmentSetId,
                        geo_zones: [{ country_code: "tr", type: "country" }],
                    },
                ],
            },
        })
        serviceZoneId = zones[0].id
        logger.info(`✅ Yeni Service Zone: ${serviceZoneId}`)
    } else {
        logger.info(`✅ Mevcut Service Zone: ${serviceZoneId}`)
    }

    // ─── 6. Link: Region ↔ Fulfillment Set ───
    try {
        await remoteLink.create({
            [Modules.REGION]: { region_id: region.id },
            [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSetId },
        })
        logger.info("✅ Region ↔ Fulfillment Set bağlandı")
    } catch (e: any) {
        logger.info(`ℹ️ Region link (zaten var olabilir): ${e.message}`)
    }

    // ─── 7. Link: Stock Location ↔ Fulfillment Set ───
    try {
        await remoteLink.create({
            [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
            [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSetId },
        })
        logger.info("✅ Stock Location ↔ Fulfillment Set bağlandı")
    } catch (e: any) {
        logger.info(`ℹ️ StockLocation link (zaten var olabilir): ${e.message}`)
    }

    // ─── 8. Link: Stock Location ↔ Manual Fulfillment Provider ───
    try {
        await remoteLink.create({
            [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
            [Modules.FULFILLMENT]: {
                fulfillment_provider_id: "manual_manual-fulfillment",
            },
        })
        logger.info("✅ Stock Location ↔ Manual Provider bağlandı")
    } catch (e: any) {
        logger.info(`ℹ️ Provider link (zaten var olabilir): ${e.message}`)
    }

    // ─── 9. Mevcut shipping option'ları kontrol et ───
    const { data: existingOptions } = await query.graph({
        entity: "shipping_option",
        fields: ["id", "name"],
    })
    if (existingOptions.length > 0) {
        logger.info(
            `✅ Zaten ${existingOptions.length} kargo seçeneği var: ${existingOptions
                .map((o: any) => o.name)
                .join(", ")}`
        )
        logger.info("🎉 [setup-checkout] Tamamlandı (kargo zaten kurulu).")
        return
    }

    // ─── 10. Kargo seçeneklerini oluştur ───
    const { result: options } = await createShippingOptionsWorkflow(
        container
    ).run({
        input: [
            {
                name: "Standart Kargo",
                price_type: "flat",
                provider_id: "manual_manual-fulfillment",
                service_zone_id: serviceZoneId!,
                shipping_profile_id: profileId,
                type: {
                    label: "Standart",
                    description: "1-3 iş günü içinde teslimat",
                    code: "standard",
                },
                prices: [{ currency_code: "try", amount: 49.9 }],
                rules: [
                    {
                        attribute: "enabled_in_store",
                        value: "true",
                        operator: "eq",
                    },
                    {
                        attribute: "is_return",
                        value: "false",
                        operator: "eq",
                    },
                ],
            },
            {
                name: "Ücretsiz Kargo",
                price_type: "flat",
                provider_id: "manual_manual-fulfillment",
                service_zone_id: serviceZoneId!,
                shipping_profile_id: profileId,
                type: {
                    label: "Ücretsiz",
                    description: "500 TL üzeri siparişlerde ücretsiz (3-5 iş günü)",
                    code: "free",
                },
                prices: [{ currency_code: "try", amount: 0 }],
                rules: [
                    {
                        attribute: "enabled_in_store",
                        value: "true",
                        operator: "eq",
                    },
                    {
                        attribute: "is_return",
                        value: "false",
                        operator: "eq",
                    },
                ],
            },
        ],
    })

    logger.info(
        `🎉 [setup-checkout] ${options.length} kargo seçeneği oluşturuldu: ${options
            .map((o: any) => o.name)
            .join(", ")}`
    )
}
