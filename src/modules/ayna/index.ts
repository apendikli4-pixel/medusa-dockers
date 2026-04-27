import { Module } from "@medusajs/framework/utils"
import AynaService from "./service"
import HybridAIProviderService from "./services/hybrid-ai.provider"
import InjectionDetectorService from "./services/injection-detector.service"
import {
    MemoryTruth,
    MemoryInsight,
    MemoryConscience
} from "./models/memory"
import { Mission } from "./models/mission"

export const AYNA_MODULE = "ayna"

export default Module(AYNA_MODULE, {
    service: AynaService,
    // Register additional services that can be injected
    services: [
        {
            name: "hybridAIProvider",
            service: HybridAIProviderService
        },
        {
            name: "injectionDetectorService",
            service: InjectionDetectorService
        }
    ]
})

export { AynaService, HybridAIProviderService, InjectionDetectorService }
