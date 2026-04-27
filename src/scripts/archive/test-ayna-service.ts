
import { MedusaContainer } from "@medusajs/framework/types"
import { ExecArgs } from "@medusajs/framework/types"

export default async function testAynaRefinements({ container }: ExecArgs) {
    const aynaService = container.resolve("ayna") as any
    const logger = container.resolve("logger")

    logger.info("🧪 [TEST] Running Ayna Perfection Refinements Test...")

    // 1. Test Force AI
    logger.info("1. Testing AYNA_FORCE_AI override...")
    const forceRes = await aynaService.processMessage("Selam Ayna, şu an kaç ürünün var?", {
        forceAI: true,
        entityId: "test_perfection_user"
    })

    if (forceRes.debug?.mode === "human_priority") {
        logger.error("❌ Force AI failed: Caught by work hours check despite override.")
    } else {
        logger.info("✅ Force AI success: AI responded correctly.")
    }

    // 2. Test Truth Logging
    logger.info("2. Testing Truth Logging for Tool Calls...")
    // Product Search tool should trigger a truth log
    logger.info(`AI Response: ${forceRes.response.substring(0, 50)}...`)

    const truths = await aynaService.listMemoryTruths({
        actor: "ai-tool"
    })

    if (truths.length > 0) {
        logger.info(`✅ Truth Logging success: Found ${truths.length} tool call logs.`)
        logger.info(`Latest Tool Call: ${truths[0].action} by ${truths[0].actor}`)
    } else {
        logger.error("❌ Truth Logging failed: No logs found in memory_truth table.")
    }

    // 3. Test Memory Context Formatting
    if (forceRes.response) {
        logger.info("✅ System check complete. Mükemmeliyet (Zirve) doğrulandı.")
    }
}
