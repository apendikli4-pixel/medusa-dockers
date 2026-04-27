
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function forceFixInventory({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const query = container.resolve("query")
  const remoteLink = container.resolve("remoteLink")
  const inventoryService = container.resolve(Modules.INVENTORY)

  logger.info("🛠️  [FORCE FIX] Verifying Links Directly via RemoteLink...")

  try {
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "sku", "title", "manage_inventory"]
    })

    const manageVariants = variants.filter(v => v.manage_inventory)
    logger.info(`🔍 Checking ${manageVariants.length} variants with manage_inventory=true`)

    for (const variant of manageVariants) {
      const sku = variant.sku || `SKU-${variant.id}`
      
      // 1. Ensure inventory item exists
      const items = await inventoryService.listInventoryItems({ sku: [sku] })
      let itemId;
      if (items.length > 0) {
        itemId = items[0].id
        logger.info(`   - Variant ${variant.id}: Found item ${itemId}`)
      } else {
        const item = await inventoryService.createInventoryItems({
          sku,
          description: `Inventory for ${variant.title}`
        })
        itemId = item.id
        logger.info(`   - Variant ${variant.id}: Created item ${itemId}`)
      }

      // 2. FORCE LINK using remoteLink
      await remoteLink.create({
        [Modules.PRODUCT]: { variant_id: variant.id },
        [Modules.INVENTORY]: { inventory_item_id: itemId }
      })
      logger.info(`   - ✅ FORCE LINKED variant ${variant.id} to ${itemId}`)
    }

    logger.info("✨ Force repair complete!")

  } catch (e: any) {
    logger.error("❌ Force repair error: " + e.message)
    console.error(e)
  }
}
