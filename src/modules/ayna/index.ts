import { Module } from "@medusajs/framework/utils"
import AynaService from "./service"
import HybridAIProviderService from "./services/hybrid-ai.provider"
import {
    MemoryTruth,
    MemoryInsight,
    MemoryConscience
} from "./models/memory"
import { Mission } from "./models/mission"

export const AYNA_MODULE = "ayna"

/**
 * NOT: InjectionDetectorService henüz implemente edilmedi. Prompt-security
 * middleware'ı geçici olarak no-op (her isteği geçirir). Gerçek detector
 * eklendiğinde buradan re-register edilecek.
 * @see src/api/middlewares/prompt-security.ts
 */
export default Module(AYNA_MODULE, {
    service: AynaService,
})

export { AynaService, HybridAIProviderService }
