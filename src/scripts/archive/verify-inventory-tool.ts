
import { ExecArgs } from "@medusajs/framework/types"

export default async function verifyToolAccessibility({ container }: ExecArgs) {
    const aynaService = container.resolve("ayna") as any
    const logger = container.resolve("logger")

    logger.info("🧪 [VERIFY] Testing InventoryManagerTool accessibility (VERBOSE)...")

    // Force AI and use a clear command
    const testMessage = "Havuz Kimyasalları kategorisi planla ve Sıvı Klor ürünü ekle. manage_inventory aracını kullan.";

    try {
        const result = await aynaService.processMessage(testMessage, {
            entityId: "test_inventory_user",
            forceAI: true
        });

        console.log("--- AI RESPONSE START ---");
        console.log(result.response);
        console.log("--- AI RESPONSE END ---");
        console.log("DEBUG INFO:", JSON.stringify(result.debug, null, 2));

        if (result.debug.tool_used) {
            logger.info("✅ SUCCESS: AI used a tool!");
        } else {
            logger.warn("⚠️ WARNING: AI did NOT use any tool. Response was purely text.");
        }
    } catch (e: any) {
        logger.error("❌ Test failed: " + e.message);
    }
}
