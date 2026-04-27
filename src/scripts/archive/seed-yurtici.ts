import {
    batchLinksWorkflow,
    createLocationFulfillmentSetWorkflow,
    createServiceZonesWorkflow,
    createShippingOptionsWorkflow,
    createShippingProfilesWorkflow,
} from "@medusajs/medusa/core-flows"
import { ExecArgs, Logger } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function seedYurtici({
    container,
}: ExecArgs) {
    const logger = container.resolve<Logger>("logger")
    const regionModuleService = container.resolve(Modules.REGION)
    const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

    logger.info("Yurtiçi Kargo kargo seçenekleri ekleniyor...")

    // Log available providers
    // @ts-ignore
    const providers = await fulfillmentModuleService.listFulfillmentProviders()
    logger.info(`Kayıtlı Kargo Sağlayıcıları: ${providers.map((p: any) => p.id).join(", ")}`)

    try {
        // 1. Türkiye bölgesini bul
        const [turkeyRegion] = await regionModuleService.listRegions({ name: "Turkey" })

        if (!turkeyRegion) {
            logger.warn("Turkey bölgesi bulunamadı. Lütfen önce bölgeleri oluşturun.")
            return
        }

        // 2. Kargo Profili Oluştur (Eğer yoksa)
        const [defaultProfile] = await fulfillmentModuleService.listShippingProfiles({
            name: "Varsayılan"
        })

        let profileId = defaultProfile?.id

        if (!profileId) {
            const { result: createProfileResult } = await createShippingProfilesWorkflow(
                container
            ).run({
                input: {
                    data: [
                        {
                            name: "Varsayılan",
                            type: "default",
                        },
                    ],
                },
            })
            profileId = createProfileResult[0].id
        }

        logger.info(`Profil ID: ${profileId}`)

        // 3. Fulfillment Set Oluştur (Location ID gerekli, varsa kullanalım, yoksa varsayılanı bulalım)
        const stockLocationService = container.resolve(Modules.STOCK_LOCATION)
        const [defaultLocation] = await stockLocationService.listStockLocations({})

        if (!defaultLocation) {
            logger.warn("Varsayılan Stok Lokasyonu bulunamadı. Lütfen mağaza ayarlarınızı yapılandırın.")
            return
        }

        let fSetResult: any
        const [existingFSet] = await fulfillmentModuleService.listFulfillmentSets({
            name: "Türkiye Gönderim Mimarisi"
        }, { relations: ["service_zones"] })

        if (existingFSet) {
            logger.info(`Mevcut Fulfillment Seti bulundu. ID: ${existingFSet.id}`)
            fSetResult = existingFSet
        } else {
            const { result } = await createLocationFulfillmentSetWorkflow(container).run({
                input: {
                    location_id: defaultLocation.id,
                    fulfillment_set_data: {
                        name: "Türkiye Gönderim Mimarisi",
                        type: "shipping",
                    }
                },
            })
            fSetResult = result
            logger.info(`Yeni Fulfillment Seti oluşturuldu. ID: ${fSetResult.id}`)
        }

        // 4. Fulfillment Provider'ı Stock Location'a ve Region'a bağlamamız gerekiyor, ardından Kargo seçeneğini oluşturmalıyız.
        // Ancak daha basit olması için doğrudan Kargo Seçeneği oluşturmayı deniyoruz (Medusa v2 Core Flow)

        let serviceZoneId = fSetResult?.service_zones?.[0]?.id

        if (!serviceZoneId) {
            const { result: szResult } = await createServiceZonesWorkflow(container).run({
                input: {
                    data: [
                        {
                            name: "Türkiye Bölgesi",
                            fulfillment_set_id: fSetResult.id,
                            geo_zones: [
                                {
                                    type: "country",
                                    country_code: "tr"
                                }
                            ]
                        }
                    ]
                }
            })
            serviceZoneId = szResult[0].id
            logger.info(`Türkiye Bölgesi service zone hazır. ID: ${serviceZoneId}`)
        }

        // Hedef sağlayıcıyı Stock Location'a bağla (yoksa validate adımında patlıyor)
        logger.info("Stock Location ile Yurtiçi Kargo sağlayıcısı bağlanıyor...")
        await batchLinksWorkflow(container).run({
            input: {
                create: [
                    {
                        [Modules.STOCK_LOCATION]: { stock_location_id: defaultLocation.id },
                        [Modules.FULFILLMENT]: { fulfillment_provider_id: "yurtici_yurtici" }
                    }
                ],
                update: [],
                delete: [],
            }
        })
        logger.info("Sağlayıcı bağlandı.")

        const { result: optionResult } = await createShippingOptionsWorkflow(container).run({
            input: [
                {
                    name: "Yurtiçi Kargo Standart",
                    price_type: "flat",
                    provider_id: "yurtici_yurtici",
                    service_zone_id: serviceZoneId,
                    shipping_profile_id: profileId,
                    type: {
                        label: "Standart",
                        description: "Yurtiçi Kargo ile 1-3 iş günü teslimat",
                        code: "standard",
                    },
                    prices: [
                        {
                            currency_code: turkeyRegion.currency_code,
                            amount: 150,
                        },
                    ],
                    rules: [],
                },
            ]
        })

        logger.info("Yurtiçi Kargo kargo seçenekleri başarıyla eklendi.")

    } catch (error) {
        logger.error("Kargo seçeneği eklenirken hata oluştu:")
        console.error(error)
    }
}
