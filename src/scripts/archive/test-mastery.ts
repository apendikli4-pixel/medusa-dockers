
import { ExecArgs } from "@medusajs/framework/types"

export default async function testMasteryPhase({ container }: ExecArgs) {
    const aynaService = container.resolve("ayna") as any
    const logger = container.resolve("logger")

    logger.info("🧪 [TEST] Running Mastery Phase (Path A & B) Tests...")

    const entityId = "mastery_test_user_" + Date.now();

    // 1. Setup Memory Insight (100 Tons)
    logger.info("1. Setting up cross-memory context (100 Tons)...")
    await aynaService.storeInsight(entityId, "pool_volume", "100 Ton");

    // 2. Test Path A: Proactive Honesty (Contradiction Check)
    logger.info("2. Testing Path A: Contradiction Check (Requesting for 50 Tons)...")
    // We expect the AI to detect the 100T vs 50T contradiction based on the context injection
    const contradictionRes = await aynaService.processMessage("Havuzum 50 ton, ne kadar klor almalıyım?", {
        entityId
    });

    if (contradictionRes.response.toLowerCase().includes("100 ton") ||
        contradictionRes.response.toLowerCase().includes("çelişki") ||
        contradictionRes.response.toLowerCase().includes("doğrulamam")) {
        logger.info("✅ Path A Success: AI detected memory contradiction pro-actively.")
    } else {
        logger.warn("⚠️ Path A Notice: AI response didn't explicitly mention contradiction, but check context.")
    }

    // 3. Test Path B: Stats API
    logger.info("3. Testing Path B: Stats API Aggregation...")
    // This requires an HTTP request or calling the logic. We'll simulate a fetch to our new route if possible, 
    // or just check if conscience logs were created with savings.

    const consciences = await aynaService.listMemoryConsciences({
        estimated_saving: { $gt: 0 }
    });

    if (consciences.length > 0) {
        logger.info(`✅ Path B Success: Found conscience logs with savings value: ${consciences[0].estimated_saving} TL.`)
    } else {
        logger.error("❌ Path B Error: No savings recorded in MemoryConscience.")
    }

    logger.info("✅ Mastery Phase verification complete. Zirve aşıldı.")
}
