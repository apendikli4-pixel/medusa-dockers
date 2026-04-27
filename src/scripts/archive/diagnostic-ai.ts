
import { ExecArgs } from "@medusajs/framework/types"

export default async function verifyAIAvailability({ container }: ExecArgs) {
    const aynaService = container.resolve("ayna") as any
    const logger = container.resolve("logger")

    logger.info("🧪 [VERIFY] Testing AI availability after configuration update...")
    logger.info("Current Time (Local): " + new Date().toString());
    logger.info("AYNA_FORCE_AI (process): " + process.env.AYNA_FORCE_AI);

    try {
        const result = await aynaService.processMessage("Merhaba", { entityId: "diagnostic_user" });
        logger.info("AI Response: " + result.response);
        logger.info("Debug Info: " + JSON.stringify(result.debug, null, 2));

        if (result.redirect_to_whatsapp) {
            logger.warn("⚠️ AI REDIRECTED TO WHATSAPP");
        } else {
            logger.info("✅ AI ANSWERED DIRECTLY");
        }
    } catch (e: any) {
        logger.error("❌ Diagnostic failed: " + e.message);
    }
}
