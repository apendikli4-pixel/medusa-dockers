import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

type GenerateContentWorkflowModule = {
    generateContentWorkflow: (container: MedusaContainer) => {
        run: (input: {
            input: { productId: string }
            throwOnError: boolean
        }) => Promise<{ result?: unknown; errors?: unknown[] }>
    }
}

const loadGenerateContentWorkflow = (): GenerateContentWorkflowModule["generateContentWorkflow"] => {
    try {
        return require("../workflows/generate-content").generateContentWorkflow
    } catch (error) {
        // Medusa may execute jobs directly from src during development, where the compiled .js file does not exist yet.
        return require("../workflows/generate-content.ts").generateContentWorkflow
    }
}

export default async function autoGenerateContentJob(container: MedusaContainer) {
    const logger = container.resolve("logger") as any
    const contentIntelligence = container.resolve("aynaContentIntelligenceService") as any
    const generateContentWorkflow = loadGenerateContentWorkflow()

    logger.info("[Ayna] Strategic auto-generate content job started.")

    try {
        // 1. Stratejik fırsatları belirle (Stok ve trend analiziyle)
        const opportunities = await contentIntelligence.identifyContentOpportunities()

        if (!opportunities || opportunities.length === 0) {
            logger.info("[Ayna] No strategic content opportunities found this week.")
            return
        }

        // 2. En yüksek potansiyelli ürünü seç
        const bestOpportunity = opportunities[0]
        logger.info(`[Ayna] Selected strategic product: ${bestOpportunity.title} (${bestOpportunity.reason})`)

        // 3. Workflow'u tetikle
        const { result, errors } = await generateContentWorkflow(container).run({
            input: {
                productId: bestOpportunity.productId
            },
            throwOnError: false
        })

        if (errors && errors.length > 0) {
            logger.error(`[Ayna] Content Workflow errors: ${JSON.stringify(errors)}`)
        } else {
            logger.info(`[Ayna] Strategic blog generated for ${bestOpportunity.title}. ID: ${JSON.stringify(result)}`)
        }

    } catch (err: any) {
        logger.error(`[Ayna] Content job failure: ${err.message}`)
    }
}

export const config = {
    name: "auto-generate-content-job",
    schedule: "0 0 * * 0", // Her Pazar gece yarısı (Haftalık)
}
