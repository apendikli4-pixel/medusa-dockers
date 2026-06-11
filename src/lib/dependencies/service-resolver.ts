/**
 * Type-Safe Dependency Resolver for Medusa V2
 * 
 * Replaces silent `try-catch as any` pattern with:
 * - Explicit error logging
 * - Type-safe service resolution
 * - Graceful degradation (with fallback)
 * - Runtime type checking (isServiceAvailable)
 * 
 * Usage:
 *   const customerService = await resolveService(
 *       req.scope,
 *       Modules.CUSTOMER,
 *       logger
 *   )
 *   if (!customerService) {
 *       // Handle missing service gracefully
 *   }
 */

import { Logger } from "@medusajs/framework/types"

export interface ServiceResolutionOptions {
    /**
     * Log warnings if service unavailable (default: true)
     */
    logWarning?: boolean
    /**
     * Fallback/default value if resolution fails
     */
    fallback?: any
    /**
     * Custom error message
     */
    errorMessage?: string
}

export interface ResolvedService<T> {
    service: T | null
    isAvailable: boolean
    error?: Error
}

/**
 * Safely resolve a service from Medusa container
 * Always logs if service fails to load (no silent failures)
 *
 * @param scope Medusa DI container (req.scope)
 * @param moduleId Module identifier (Modules.PRODUCT, "custom-module", etc.)
 * @param logger Medusa logger
 * @param options Configuration
 * @returns Resolved service or null
 *
 * @example
 *   const customerService = await resolveService(
 *       req.scope,
 *       Modules.CUSTOMER,
 *       logger,
 *       { logWarning: true }
 *   )
 *   if (!customerService) {
 *       return res.status(503).json({ error: "Customer service unavailable" })
 *   }
 */
export async function resolveService<T = any>(
    scope: any,
    moduleId: string,
    logger: Logger,
    options: ServiceResolutionOptions = {}
): Promise<T | null> {
    const {
        logWarning = true,
        fallback = null,
        errorMessage = `Service unavailable: ${moduleId}`,
    } = options

    try {
        const service = scope.resolve(moduleId)

        if (!service) {
            if (logWarning) {
                logger.warn(`[DependencyResolver] Service returned null: ${moduleId}`)
            }
            return fallback
        }

        return service as T
    } catch (error: any) {
        if (logWarning) {
            logger.warn(`[DependencyResolver] Failed to resolve service: ${moduleId}`, {
                error: error.message,
                code: error.code,
                module: moduleId,
            })
        }
        return fallback
    }
}

/**
 * Batch resolve multiple services
 * Returns object with resolved services (null if unavailable)
 *
 * @example
 *   const { customer, product, inventory } = await resolveServices(
 *       req.scope,
 *       {
 *           customer: Modules.CUSTOMER,
 *           product: Modules.PRODUCT,
 *           inventory: Modules.INVENTORY,
 *       },
 *       logger
 *   )
 */
export async function resolveServices<T extends Record<string, string>>(
    scope: any,
    moduleMap: T,
    logger: Logger,
    options: ServiceResolutionOptions = {}
): Promise<Record<keyof T, any | null>> {
    const results: Record<string, any> = {}

    for (const [key, moduleId] of Object.entries(moduleMap)) {
        results[key] = await resolveService(scope, moduleId, logger, {
            ...options,
            errorMessage: `Service unavailable: ${moduleId}`,
        })
    }

    return results as Record<keyof T, any | null>
}

/**
 * Check if a service is available before using it
 *
 * @example
 *   if (await isServiceAvailable(req.scope, Modules.CUSTOMER, logger)) {
 *       const customer = req.scope.resolve(Modules.CUSTOMER)
 *       // Use customer service safely
 *   }
 */
export async function isServiceAvailable(
    scope: any,
    moduleId: string,
    logger: Logger
): Promise<boolean> {
    try {
        const service = scope.resolve(moduleId)
        return service !== null && service !== undefined
    } catch (error: any) {
        logger.debug(`[DependencyResolver] Service check failed: ${moduleId}`, {
            error: error.message,
        })
        return false
    }
}

/**
 * Require a service to be available (throw if not)
 * Use when service is mandatory for operation
 *
 * @throws {ServiceUnavailableError} if service cannot be resolved
 *
 * @example
 *   const customerService = await requireService(
 *       req.scope,
 *       Modules.CUSTOMER,
 *       logger
 *   )
 *   // customerService is guaranteed to be non-null
 */
export async function requireService<T = any>(
    scope: any,
    moduleId: string,
    logger: Logger
): Promise<T> {
    const service = await resolveService<T>(scope, moduleId, logger, {
        logWarning: true,
    })

    if (!service) {
        const error = new Error(
            `Required service not available: ${moduleId}. System cannot continue.`
        )
        logger.error(`[DependencyResolver] Required service missing: ${moduleId}`, {
            error: error.message,
            code: "SERVICE_REQUIRED",
        })
        throw error
    }

    return service
}

/**
 * Resolve with retry logic
 * Useful for services that might be initializing
 *
 * @example
 *   const service = await resolveServiceWithRetry(
 *       req.scope,
 *       Modules.CACHE,
 *       logger,
 *       { maxRetries: 3, delayMs: 100 }
 *   )
 */
export async function resolveServiceWithRetry<T = any>(
    scope: any,
    moduleId: string,
    logger: Logger,
    options: ServiceResolutionOptions & {
        maxRetries?: number
        delayMs?: number
    } = {}
): Promise<T | null> {
    const { maxRetries = 3, delayMs = 100, ...baseOptions } = options

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const service = scope.resolve(moduleId)
            if (service) {
                if (attempt > 1) {
                    logger.info(
                        `[DependencyResolver] Service resolved on attempt ${attempt}: ${moduleId}`
                    )
                }
                return service as T
            }
        } catch (error: any) {
            if (attempt === maxRetries) {
                logger.warn(
                    `[DependencyResolver] Service failed after ${maxRetries} attempts: ${moduleId}`,
                    { error: error.message }
                )
                return baseOptions.fallback || null
            }

            if (attempt < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, delayMs))
            }
        }
    }

    return baseOptions.fallback || null
}

/**
 * Helper: Resolve common Medusa modules with proper typing
 */
export class ServiceRegistry {
    constructor(
        private scope: any,
        private logger: Logger
    ) {}

    async getCustomerService() {
        const { Modules } = await import("@medusajs/framework/utils")
        return resolveService(this.scope, Modules.CUSTOMER, this.logger, {
            logWarning: true,
        })
    }

    async getProductService() {
        const { Modules } = await import("@medusajs/framework/utils")
        return resolveService(this.scope, Modules.PRODUCT, this.logger, {
            logWarning: true,
        })
    }

    async getInventoryService() {
        const { Modules } = await import("@medusajs/framework/utils")
        return resolveService(this.scope, Modules.INVENTORY, this.logger, {
            logWarning: true,
        })
    }

    async getPricingService() {
        const { Modules } = await import("@medusajs/framework/utils")
        return resolveService(this.scope, Modules.PRICING, this.logger, {
            logWarning: true,
        })
    }

    async getCartService() {
        const { Modules } = await import("@medusajs/framework/utils")
        return resolveService(this.scope, Modules.CART, this.logger, {
            logWarning: true,
        })
    }

    async getOrderService() {
        const { Modules } = await import("@medusajs/framework/utils")
        return resolveService(this.scope, Modules.ORDER, this.logger, {
            logWarning: true,
        })
    }

    async getPaymentService() {
        const { Modules } = await import("@medusajs/framework/utils")
        return resolveService(this.scope, Modules.PAYMENT, this.logger, {
            logWarning: true,
        })
    }

    async getFulfillmentService() {
        const { Modules } = await import("@medusajs/framework/utils")
        return resolveService(this.scope, Modules.FULFILLMENT, this.logger, {
            logWarning: true,
        })
    }

    async getAynaService() {
        return resolveService(this.scope, "ayna", this.logger, {
            logWarning: true,
        })
    }

    async getTenantService() {
        return resolveService(this.scope, "tenant", this.logger, {
            logWarning: true,
        })
    }

    async getRemoteQuery() {
        return resolveService(this.scope, "remoteQuery", this.logger, {
            logWarning: true,
        })
    }
}

/**
 * Factory: Create service registry from request
 */
export function createServiceRegistry(req: any): ServiceRegistry {
    const logger = req.scope.resolve("logger")
    return new ServiceRegistry(req.scope, logger)
}
