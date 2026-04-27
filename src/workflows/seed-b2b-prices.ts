
import {
    createStep,
    createWorkflow,
    WorkflowResponse,
    StepResponse
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

/**
 * Step 1: Get Wholesale Price List ID
 */
const getWholesaleListStep = createStep(
    "get-wholesale-list",
    async (_, { container }) => {
        const pricingModule = container.resolve(Modules.PRICING)
        const priceLists = await pricingModule.listPriceLists({}, { take: 100 })
        const wholesaleList = priceLists.find(pl => pl.title === "Wholesale Pricing")

        if (!wholesaleList) {
            throw new Error("Wholesale Pricing list not found. Run setup-b2b first.")
        }

        return new StepResponse(wholesaleList.id)
    }
)

/**
 * Step 2: Get Products and Variants with Price Sets
 */
const getProductsStep = createStep(
    "get-products-for-pricing",
    async (_, { container }) => {
        const remoteQuery = container.resolve("remoteQuery")

        const { data: products } = await remoteQuery.graph({
            entity: "product",
            fields: [
                "id",
                "title",
                "variants.id",
                "variants.title",
                "variants.price_set.id"
            ],
            pagination: { take: 5 }
        })
        return new StepResponse(products)
    }
)

/**
 * Step 3: Add Prices to List
 */
const addPricesStep = createStep(
    "add-wholesale-prices",
    async ({ listId, products }: { listId: string, products: any[] }, { container }) => {
        const pricingModule = container.resolve(Modules.PRICING)
        const pricesToCreate: any[] = []
        for (const product of products) {
            for (const variant of product.variants) {
                const priceSetId = variant.price_set?.id
                if (!priceSetId) continue

                // Add example B2B prices
                pricesToCreate.push({
                    currency_code: "eur",
                    amount: 8000,
                    price_set_id: priceSetId,
                    rules: {}
                })
                pricesToCreate.push({
                    currency_code: "usd",
                    amount: 8500,
                    price_set_id: priceSetId,
                    rules: {}
                })
                pricesToCreate.push({
                    currency_code: "try",
                    amount: 250000,
                    price_set_id: priceSetId,
                    rules: {}
                })
            }
        }

        if (pricesToCreate.length > 0) {
            // Trying addPriceListPrices as createPriceListPrices was not found
            // If this fails, we might need to investigate Pricing Module Service further.
            await pricingModule.addPriceListPrices([{
                price_list_id: listId,
                prices: pricesToCreate
            }])
        }


        return new StepResponse({ count: pricesToCreate.length })
    },
    async (count, { container }) => {
        // Rollback placeholder
    }
)

export const seedB2BPricesWorkflow = createWorkflow(
    "seed-b2b-prices",
    () => {
        const listId = getWholesaleListStep()
        const products = getProductsStep()
        const result = addPricesStep({ listId, products })

        return new WorkflowResponse(result)
    }
)
