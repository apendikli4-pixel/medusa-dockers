/**
 * Global Error Handler Middleware for Medusa V2
 * 
 * Extends (not replaces) Medusa's error handling:
 * - Wraps unknown errors in ApiError
 * - Ensures proper HTTP status codes
 * - Masks stack traces & internal paths
 * - Correlates with request ID for tenant-safe logging
 * - Respects multi-tenant isolation (no tenant data in error response)
 * 
 * Applied AFTER Medusa's auth + container middleware,
 * BEFORE route handlers (uses next.js middleware pattern).
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import {
    ApiError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ServiceUnavailableError,
    InternalError,
} from "./api-error"

// Route'lar hata sınıflarını tek modülden alabilsin (api-error'ı ayrıca
// import etmek zorunda kalmasın) — chat route'u bunlara buradan erişiyor.
export {
    ApiError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ServiceUnavailableError,
    InternalError,
} from "./api-error"

/**
 * Generate or extract request ID for tracing
 */
function getRequestId(req: any): string {
    return (
        req.headers["x-request-id"] ||
        req.headers["x-correlation-id"] ||
        `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    )
}

/**
 * Extract tenant ID safely (from auth context, not user input)
 */
function getTenantId(req: any): string {
    // Tenant set by auth middleware (Medusa), NOT from headers
    return req.tenant_id || req.auth_context?.tenant_id || "tnt_unknown"
}

/**
 * Error Response DTO (safe for client)
 * - No stack traces
 * - No internal paths
 * - No tenant data from other tenants
 * - Request ID for correlation
 */
interface ErrorResponse {
    error: {
        code: string
        message: string
        requestId: string
        details?: any
    }
    retryAfter?: number // For 429
}

/**
 * Convert error to ApiError (defensive)
 */
function normalizeError(error: any): ApiError {
    // Already ApiError
    if (error instanceof ApiError) {
        return error
    }

    // Zod validation
    if (error instanceof z.ZodError) {
        return new ValidationError("Request validation failed", {
            fields: error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
                code: issue.code,
            })),
        })
    }

    // Medusa HTTP exceptions (HttpException, BadRequestException, etc.)
    // Medusa v2 uses @nestjs/common-style exceptions
    if (error.statusCode && typeof error.statusCode === "number") {
        const statusCode = error.statusCode
        const message = error.message || "Request failed"

        // Map Medusa status codes to our ApiError types
        if (statusCode === 400) {
            return new ValidationError(message, error.response?.message)
        }
        if (statusCode === 401) {
            return new AuthenticationError(message)
        }
        if (statusCode === 403) {
            return new AuthorizationError(message)
        }
        if (statusCode === 404) {
            return new NotFoundError("Resource")
        }
        if (statusCode === 409) {
            return new ApiError({
                statusCode: 409,
                code: "CONFLICT",
                message,
                isOperational: true,
            })
        }
        if (statusCode === 429) {
            const retryAfter = parseInt(
                error.headers?.["retry-after"] || "60",
                10
            )
            return new RateLimitError(message, retryAfter)
        }
        if (statusCode >= 500) {
            return new ServiceUnavailableError("API", message)
        }

        // Generic HTTP error
        return new InternalError(message, error)
    }

    // Unknown error → wrap in InternalError (500)
    return new InternalError(
        "An unexpected error occurred",
        error instanceof Error ? error : new Error(String(error))
    )
}

/**
 * Main error handler middleware
 * Use in routes: wrap handler in try-catch, pass error here
 */
export function createErrorHandler(logger: any) {
    return (error: any, req: any, res: any) => {
        const requestId = getRequestId(req)
        const tenantId = getTenantId(req)

        // Normalize to ApiError
        const apiError = normalizeError(error)

        // Log (with tenant context, but NOT in response)
        const logContext = {
            requestId,
            tenantId,
            method: req.method,
            path: req.path,
            statusCode: apiError.statusCode,
            code: apiError.code,
            isOperational: apiError.isOperational,
        }

        if (apiError.isOperational) {
            // Expected error (validation, auth, etc.) → warn level
            logger.warn(`[${apiError.code}] ${apiError.message}`, logContext)
        } else {
            // Unexpected error (crash, service down) → error level + stack
            logger.error(`[${apiError.code}] ${apiError.message}`, {
                ...logContext,
                stack: apiError.cause?.stack || error.stack, // Server-side only
                cause: apiError.cause?.message,
            })
        }

        // Build response (SAFE — no internals exposed)
        const errorResponse: ErrorResponse = {
            error: {
                code: apiError.code,
                message: apiError.message,
                requestId, // Client can report this for support
            },
        }

        // Include details only if validation error (field-level info is not a leak)
        if (apiError.statusCode === 400 && apiError.details) {
            errorResponse.error.details = apiError.details
        }

        // For 429, include Retry-After
        if (apiError instanceof RateLimitError) {
            res.setHeader("Retry-After", apiError.retryAfter.toString())
            errorResponse.retryAfter = apiError.retryAfter
        }

        // Always set request ID header (for client tracing)
        res.setHeader("X-Request-ID", requestId)

        return res.status(apiError.statusCode).json(errorResponse)
    }
}

/**
 * Wrapper for route handlers to catch errors
 * 
 * Usage:
 *   export const POST = errorHandlerWrapper(async (req, res) => {
 *       // handler logic
 *   })
 */
export function errorHandlerWrapper(
    // Promise<unknown>: handler'lar `return res.status(...).json(...)` deseni
    // kullanabilir (Express idiomu) — dönüş değeri zaten kullanılmıyor.
    handler: (req: MedusaRequest, res: MedusaResponse) => Promise<unknown>
) {
    return async (req: MedusaRequest, res: MedusaResponse) => {
        try {
            await handler(req, res)
        } catch (error) {
            const logger = req.scope.resolve("logger")
            const errorHandler = createErrorHandler(logger)
            return errorHandler(error, req, res)
        }
    }
}

/**
 * Assert helper for validation
 * Throws ValidationError if condition fails
 */
export function assert(
    condition: boolean,
    message: string,
    details?: any
): asserts condition {
    if (!condition) {
        throw new ValidationError(message, details)
    }
}

/**
 * Type guard for ApiError
 */
export function isApiError(error: any): error is ApiError {
    return error instanceof ApiError
}
