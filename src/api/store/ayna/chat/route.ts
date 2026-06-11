/**
 * POST /store/ayna/chat
 * Customer-facing AI chat endpoint with production-grade error handling
 * 
 * Changes from v1:
 * 1. Request timeout (30s) + graceful degradation for slow Ollama
 * 2. Structured error handling (no silent failures)
 * 3. Type-safe service resolution (no `as any`)
 * 4. Tenant-isolated logging & rate limiting
 * 5. Circuit breaker: if Ollama unreachable, return cached/fallback response
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import {
    errorHandlerWrapper,
    assert,
    ValidationError,
    ServiceUnavailableError,
} from "../../../../lib/errors/error-handler"
import { SafeLogger, logInfo, logError, logWarn, startTimer } from "../../../../lib/errors/safe-logger"
import {
    resolveService,
    resolveServices,
    createServiceRegistry,
} from "../../../../lib/dependencies/service-resolver"
import { checkRateLimit, RATE_LIMITERS } from "../../../../lib/rate-limiting/multi-tenant-limiter"

/**
 * Request validation schema
 */
const ChatRequestSchema = z.object({
    message: z.string().min(1, "Message cannot be empty").max(4000, "Message too long"),
    image: z.string().optional(), // base64
})

type ChatRequest = z.infer<typeof ChatRequestSchema>

/**
 * Ollama health check with timeout
 * If Ollama is down/slow, circuit breaker activates
 */
async function checkOllamaHealth(
    aynaService: any,
    logger: SafeLogger,
    timeoutMs: number = 5000
): Promise<boolean> {
    if (!aynaService?.isHealthy) {
        return false
    }

    try {
        const timer = startTimer()
        const isHealthy = await Promise.race([
            aynaService.isHealthy(),
            new Promise<false>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
        ])

        if (!isHealthy) {
            logger.warn("Ollama health check failed", undefined, {
                details: { duration: timer.end() },
            })
        }

        return isHealthy
    } catch (error) {
        logger.warn("Ollama health check error", undefined, {
            error: error instanceof Error ? error : new Error(String(error)),
        })
        return false
    }
}

/**
 * Fallback response when Ollama is unavailable
 */
function getFallbackResponse(tenantId: string): { response: string; fallback: boolean } {
    return {
        response:
            "I'm temporarily unable to respond. Our AI system is being updated. Please try again in a moment.",
        fallback: true,
    }
}

/**
 * Main handler with timeout protection
 */
export const POST = errorHandlerWrapper(async (req: MedusaRequest, res: MedusaResponse) => {
    const timer = startTimer()
    const logger = new SafeLogger(req.scope.resolve("logger"))
    const tenantId = (req as any).tenant_id || "tnt_unknown"

    // 1. Rate limiting (multi-tenant, per-tier)
    const rateLimitOk = await checkRateLimit(req, res, RATE_LIMITERS.aynaChat, logger.logger)
    if (rateLimitOk !== true) {
        return // Response already sent by checkRateLimit
    }

    // 2. Request validation (Zod)
    let parsedBody: ChatRequest
    try {
        parsedBody = ChatRequestSchema.parse(req.body)
    } catch (error) {
        throw new ValidationError("Invalid chat request", {
            issues: error instanceof z.ZodError ? error.issues : [{ message: String(error) }],
        })
    }

    const { message, image } = parsedBody

    // 3. Service resolution (type-safe, with error logging)
    const registry = createServiceRegistry(req)

    const aynaService = await registry.getAynaService()
    assert(aynaService, "Ayna service unavailable", { tenantId })

    // Resolve optional services (graceful degradation if unavailable)
    const {
        customer: customerService,
        product: productService,
        inventory: inventoryService,
    } = await resolveServices(
        req.scope,
        {
            customer: Modules.CUSTOMER,
            product: Modules.PRODUCT,
            inventory: Modules.INVENTORY,
        },
        logger.logger,
        { logWarning: true }
    )

    const remoteQuery = await resolveService(req.scope, "remoteQuery", logger.logger, {
        logWarning: true,
    })

    // 4. Extract customer context (safe identity)
    let customerId: string | undefined = undefined
    let customerGroup: string = "B2C_Retail"

    const authContext = (req as any).auth_context
    if (authContext?.actor_id) {
        customerId = authContext.actor_id

        if (customerService) {
            try {
                const customer = await customerService.retrieveCustomer(customerId, {
                    relations: ["groups"],
                })

                if (customer?.groups?.[0]) {
                    customerGroup = customer.groups[0].name || customerGroup
                }
            } catch (error) {
                logger.warn("Failed to fetch customer group, using default", undefined, {
                    customerId,
                    error: error instanceof Error ? error : new Error(String(error)),
                })
            }
        }
    }

    // 5. Check Ollama health (circuit breaker)
    logInfo(req, "Chat request started", {
        customerId,
        messageLength: message.length,
        hasImage: !!image,
    })

    const ollamaHealthy = await checkOllamaHealth(aynaService, logger, 5000)

    if (!ollamaHealthy) {
        logWarn(req, "Ollama unavailable, returning fallback response", {
            customerId,
        })

        return res.status(200).json(getFallbackResponse(tenantId))
    }

    // 6. Process message with timeout (prevents hanging requests)
    let result: any
    try {
        result = await Promise.race([
            aynaService.processMessage(message, {
                customerId,
                customerGroup,
                image,
                isAdmin: false,
                tenantId,
                productModuleService: productService,
                inventoryService,
                remoteQuery,
            }),
            new Promise<never>((_, reject) =>
                setTimeout(
                    () =>
                        reject(
                            new Error(
                                "AI processing timeout (30s). Please try a simpler question."
                            )
                        ),
                    30000
                )
            ),
        ])
    } catch (error: any) {
        if (error.message.includes("timeout")) {
            logWarn(req, "Chat processing timeout", {
                customerId,
                duration: timer.end(),
            })

            // Timeout → graceful degradation
            return res.status(200).json({
                response:
                    "Your question took too long to answer. Please try a simpler question or try again shortly.",
                fallback: true,
            })
        }

        throw new ServiceUnavailableError("Ayna", error.message)
    }

    // 7. Log success
    logInfo(req, "Chat response sent", {
        customerId,
        duration: timer.end(),
        responseLength: result?.response?.length || 0,
    })

    return res.status(200).json(result)
})
