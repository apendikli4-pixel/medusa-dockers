/**
 * test-ai-content.ts — Ayna AI içerik üretimini doğrular (Ollama fallback).
 *
 * Çalıştırma:
 *   docker exec medusa_server_core_v2 npx medusa exec ./src/scripts/test-ai-content.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { AYNA_MODULE } from "../modules/ayna"
import type AynaAIService from "../modules/ayna/service"

export default async function testAiContent({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const ayna = container.resolve(AYNA_MODULE) as AynaAIService

    logger.info("🤖 [test-ai] Blog içeriği üretiliyor (başlık → SEO içerik)...")

    try {
        const content = await ayna.generateContent({
            type: "blog_post",
            topic: "Havuz suyu bakımında klor tabletinin doğru kullanımı",
            keywords: ["havuz kimyasalı", "klor tableti", "havuz bakımı"],
            tone: "professional",
            language: "tr",
        })
        const text =
            typeof content === "string" ? content : JSON.stringify(content, null, 2)
        logger.info("✅ [test-ai] İçerik üretildi!")
        logger.info("─────────── ÜRETİLEN İÇERİK (ilk 700 karakter) ───────────")
        logger.info(text.slice(0, 700))
        logger.info("───────────────────────────────────────────────────────────")
        logger.info(`Toplam uzunluk: ${text.length} karakter`)
    } catch (err: any) {
        logger.error(`❌ [test-ai] HATA: ${err.message}`)
        console.error(err)
    }
}
