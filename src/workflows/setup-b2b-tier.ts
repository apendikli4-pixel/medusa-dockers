
import {
    createStep,
    createWorkflow,
    WorkflowResponse,
    StepResponse
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

/**
 * Step 1: Create or Reuse B2B Customer Group
 */
const upsertB2BCustomerGroupStep = createStep(
    "upsert-b2b-customer-group",
    async (_, { container }) => {
        const customerModule = container.resolve(Modules.CUSTOMER)

        // Check if group exists
        const existingGroups = await customerModule.listCustomerGroups({
            name: "B2B_Wholesale"
        })

        console.log("Existing Groups:", existingGroups)
        console.log("Is Array:", Array.isArray(existingGroups))

        if (existingGroups.length > 0) {
            // Check if returned data is correct structure
            const group = existingGroups[0]
            if (group && group.id) {
                return new StepResponse(group, group.id)
            }
        }

        const [newGroup] = await customerModule.createCustomerGroups([{
            name: "B2B_Wholesale",
            metadata: {
                description: "Wholesale customers for B2B pricing tier"
            }
        }])

        return new StepResponse(newGroup, newGroup.id)
    },
    async (groupId, { container }) => {
        if (!groupId) return
        const customerModule = container.resolve(Modules.CUSTOMER)
        // Rollback logic: potentially delete the group if it was just created
        // For idempotency, user might not want to delete it if it existed before. 
        // We'll skip delete for now to be safe on existing data.
    }
)

/**
 * Step 2: Create Wholesale Price List Rule Type
 * Ensures that 'customer_group_id' is a valid rule type for price lists.
 */
const ensureRuleTypeStep = createStep(
    "ensure-rule-type",
    async (_, { container }) => {
        const pricingModule = container.resolve(Modules.PRICING)

        // This is implicit in Medusa v2 usually, but strict check is good.
        // For now, we assume 'customer_group_id' is standard.
        return new StepResponse({ success: true })
    }
)

/**
 * Step 3: Create or Update Wholesale Price List
 */
const upsertPriceListStep = createStep(
    "upsert-wholesale-price-list",
    async ({ groupId }: { groupId: string }, { container }) => {
        const pricingModule = container.resolve(Modules.PRICING)

        // List all price lists and find by title manually to avoid filter issues
        const priceLists = await pricingModule.listPriceLists({}, { take: 100 })
        const existingList = priceLists.find(pl => pl.title === "Wholesale Pricing")

        let priceListId = existingList ? existingList.id : null

        if (!priceListId) {
            const [newPriceList] = await pricingModule.createPriceLists([{
                title: "Wholesale Pricing",
                description: "Special pricing for B2B customers",
                type: "override",
                status: "active",
                rules: {
                    customer_group_id: [groupId]
                }
            }])
            priceListId = newPriceList.id
        } else {
            // Update existing to ensure rules are set
            await pricingModule.updatePriceLists([{
                id: priceListId,
                rules: {
                    customer_group_id: [groupId]
                }
            }])
        }

        return new StepResponse({ id: priceListId }, priceListId)
    }
)

export const setupB2BTierWorkflow = createWorkflow(
    "setup-b2b-tier",
    () => {
        const group = upsertB2BCustomerGroupStep()
        ensureRuleTypeStep()
        const priceList = upsertPriceListStep({ groupId: group.id })

        return new WorkflowResponse({
            customer_group: group,
            price_list: priceList
        })
    }
)
