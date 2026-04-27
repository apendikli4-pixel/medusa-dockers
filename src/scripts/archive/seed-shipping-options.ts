
import { ExecArgs } from "@medusajs/framework/types"
import { createShippingOptionsWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, Modules } from "@medusajs/utils"

export default async function seedShipping({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
    const regionModuleService = container.resolve(Modules.REGION)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

    const regionId = "reg_01KHAT6BRB4DNC8FXG3T0T1Y5Z"
    logger.info(`🧪 [SEED] Setting up fulfillment for region: ${regionId}`)

    try {
        // 0. Find Default Shipping Profile
        const { data: profiles } = await query.graph({
            entity: "shipping_profile",
            fields: ["id", "name"]
        })
        const profileId = profiles[0]?.id
        if (!profileId) throw new Error("No shipping profile found")
        logger.info(`✅ Found Shipping Profile: ${profileId}`)

        // 1. Create or Find Fulfillment Set
        const { data: existingSets } = await query.graph({
            entity: "fulfillment_set",
            fields: ["id", "name", "service_zones.id"],
            filters: { name: "Genesis Delivery Set" }
        })

        let fSet;
        let serviceZoneId;

        if (existingSets.length > 0) {
            fSet = existingSets[0];
            serviceZoneId = fSet.service_zones[0].id;
            logger.info(`✅ Using existing Fulfillment Set: ${fSet.id} (Zone: ${serviceZoneId})`)
        } else {
            // @ts-ignore
            const fSetBatch = await fulfillmentModuleService.createFulfillmentSets({
                name: "Genesis Delivery Set",
                type: "delivery",
                service_zones: [
                    {
                        name: "Turkey Service Zone",
                        geo_areas: [
                            {
                                country_code: "tr",
                                type: "country"
                            }
                        ],
                        // @ts-ignore
                        shipping_providers: [{ id: "manual_manual-fulfillment" }]
                    }
                ]
            })
            fSet = Array.isArray(fSetBatch) ? fSetBatch[0] : fSetBatch
            serviceZoneId = fSet.service_zones[0].id
            logger.info(`✅ Created NEW Fulfillment Set with provider: ${fSet.id} (Zone: ${serviceZoneId})`)
        }

        // 2. Link to Region (Remote Link)
        try {
            await remoteLink.create([
                {
                    [Modules.REGION]: {
                        region_id: regionId
                    },
                    [Modules.FULFILLMENT]: {
                        fulfillment_set_id: fSet.id
                    }
                }
            ])
            logger.info("✅ Linked Fulfillment Set to Region")
        } catch (e: any) {
            logger.info(`ℹ️ Link step (Region) info: ${e.message}`)
        }

        // 2.5 Link Fulfillment Set to Stock Location
        const stockLocationId = "sloc_01KHJRS2BPM47PHTXYB6V4Q116"
        try {
            await remoteLink.create([
                {
                    [Modules.STOCK_LOCATION]: {
                        stock_location_id: stockLocationId
                    },
                    [Modules.FULFILLMENT]: {
                        fulfillment_set_id: fSet.id
                    }
                }
            ])
            logger.info("✅ Linked Fulfillment Set to Stock Location")
        } catch (e: any) {
            logger.info(`ℹ️ Link step (StockLocation) info: ${e.message}`)
            // Fallback: try different key if needed
            try {
                await remoteLink.create([
                    {
                        stock_location: { stock_location_id: stockLocationId },
                        fulfillment: { fulfillment_set_id: fSet.id }
                    }
                ])
                logger.info("✅ Linked (Fallback Keys) worked")
            } catch (e2: any) {
                logger.info(`ℹ️ Link fallback info: ${e2.message}`)
            }
        }

        // 2.6 Link Provider to Stock Location
        try {
            await remoteLink.create([
                {
                    [Modules.STOCK_LOCATION]: {
                        stock_location_id: stockLocationId
                    },
                    [Modules.FULFILLMENT]: {
                        fulfillment_provider_id: "manual_manual-fulfillment"
                    }
                }
            ])
            logger.info("✅ Linked Provider to Stock Location")
        } catch (e: any) {
            logger.info(`ℹ️ Link step (Provider) info: ${e.message}`)
        }

        // 3. Create Shipping Option using Workflow
        const { result } = await createShippingOptionsWorkflow(container).run({
            input: [
                {
                    name: "Genesis Standart Kargo",
                    price_type: "flat",
                    provider_id: "manual_manual-fulfillment",
                    service_zone_id: serviceZoneId,
                    shipping_profile_id: profileId,
                    type: {
                        label: "Standart",
                        description: "Standart teslimat",
                        code: "standard"
                    },
                    prices: [
                        {
                            currency_code: "try",
                            amount: 0
                        }
                    ],
                    rules: []
                }
            ]
        })
        logger.info(`✅ Created Shipping Option: ${result[0].id}`)

    } catch (e: any) {
        logger.error("❌ Seeding failed: " + e.message)
        console.error(e)
    }
}
