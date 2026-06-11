/**
 * Structured Logging Helper — Tenant-isolated, stack-trace safe
 * 
 * Ensures:
 * - Tenant context always included (for multi-tenant debugging)
 * - Sensitive data never exposed (paths, secrets, internal state)
 * - Stack traces logged server-side only, never to client
 * - Consistent log format (JSON) for log aggregation (ELK, CloudWatch)
 * - Request correlation ID for tracing request → error chains
 */

import { Logger } from "@medusajs/framework/types"

export interface LogContext {
    tenantId?: string
    requestId?: string
    customerId?: string
    userId?: string
    [key: string]: any
}

export interface LogMetadata {
    error?: Error | string
    code?: string
    statusCode?: number
    duration?: number
    details?: any
    [key: string]: any
}

/**
 * Sanitize sensitive data from log output
 * Removes: passwords, tokens, API keys, file paths (except safe ones)
 */
function sanitizeSensitiveData(obj: any, depth = 0): any {
    if (depth > 5) return "[circular]" // Prevent infinite recursion

    const sensitiveKeys = [
        "password",
        "passwd",
        "pwd",
        "secret",
        "token",
        "api_key",
        "apiKey",
        "authorization",
        "auth",
        "bearer",
        "credit_card",
        "card_number",
        "cvv",
        "ssn",
        "database_url",
        "databaseUrl",
        "redis_url",
        "redisUrl",
        "jwt_secret",
        "jwtSecret",
        "cookie_secret",
        "cookieSecret",
    ]

    if (obj === null || obj === undefined) {
        return obj
    }

    // String: check for patterns (URLs with creds, file paths, etc.)
    if (typeof obj === "string") {
        // Hide absolute paths (but keep relative)
        if (obj.startsWith("/") && obj.includes("node_modules")) {
            return "[file_path]"
        }
        // Hide URLs with credentials
        if (obj.includes("://") && (obj.includes("@") || obj.includes("password"))) {
            return "[credentials_url]"
        }
        // Hide long tokens
        if (obj.length > 100 && /^[a-zA-Z0-9+/=]+$/.test(obj)) {
            return `[token_${obj.slice(0, 8)}...]`
        }
        return obj
    }

    // Array
    if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeSensitiveData(item, depth + 1))
    }

    // Object
    if (typeof obj === "object") {
        const sanitized: any = {}
        for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase()
            if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
                sanitized[key] = "[redacted]"
            } else {
                sanitized[key] = sanitizeSensitiveData(value, depth + 1)
            }
        }
        return sanitized
    }

    return obj
}

/**
 * Extract stack trace lines, hide sensitive paths
 */
function sanitizeStackTrace(stack: string): string {
    if (!stack) return ""

    return stack
        .split("\n")
        .map((line) => {
            // Hide absolute paths: /home/user/project/src → /[project]/src
            return line.replace(
                /\/.+?\/(?:medusa-dockers|project|app)\//g,
                "/[app]/"
            )
        })
        .join("\n")
}

/**
 * Core logging function with tenant + request context
 */
function log(
    logger: Logger,
    level: "info" | "warn" | "error" | "debug",
    message: string,
    context?: LogContext,
    metadata?: LogMetadata
) {
    const timestamp = new Date().toISOString()
    const requestId = context?.requestId || "no-request-id"
    const tenantId = context?.tenantId || "no-tenant"

    // Sanitize metadata
    const sanitizedMeta = sanitizeSensitiveData(metadata || {})

    // Build structured log object
    const logObject = {
        timestamp,
        level,
        message,
        requestId,
        tenantId,
        customerId: context?.customerId,
        userId: context?.userId,
        ...sanitizedMeta,
    }

    // If error with stack, add it (but sanitized, server-side only)
    if (metadata?.error instanceof Error) {
        logObject.error = {
            message: metadata.error.message,
            code: metadata.error.name,
            stack: sanitizeStackTrace(metadata.error.stack || ""),
        }
    }

    // Remove undefined values
    Object.keys(logObject).forEach(
        (key) => logObject[key] === undefined && delete logObject[key]
    )

    // Call Medusa logger with level
    logger[level](message, logObject)
}

/**
 * Safe structured logger for routes/services
 * Usage:
 *   const logger = new SafeLogger(req.scope.resolve("logger"))
 *   logger.info("User logged in", { tenantId, requestId, customerId })
 */
export class SafeLogger {
    constructor(private logger: Logger) {}

    info(message: string, context?: LogContext, metadata?: LogMetadata) {
        log(this.logger, "info", message, context, metadata)
    }

    warn(message: string, context?: LogContext, metadata?: LogMetadata) {
        log(this.logger, "warn", message, context, metadata)
    }

    error(message: string, context?: LogContext, metadata?: LogMetadata) {
        log(this.logger, "error", message, context, metadata)
    }

    debug(message: string, context?: LogContext, metadata?: LogMetadata) {
        log(this.logger, "debug", message, context, metadata)
    }
}

/**
 * Helper: extract request context from Medusa request
 */
export function getLogContext(req: any): LogContext {
    return {
        tenantId: req.tenant_id || "no-tenant",
        requestId: req.headers["x-request-id"] || "no-request-id",
        customerId: req.auth_context?.actor_id,
        userId: req.auth_context?.user_id,
    }
}

/**
 * Performance timing helper
 * Usage:
 *   const timer = startTimer()
 *   // ... do work ...
 *   logger.info("Task completed", context, { duration: timer.end() })
 */
export class Timer {
    private startTime = Date.now()

    end(): number {
        return Date.now() - this.startTime
    }

    mark(label: string): void {
        console.log(`[${label}] ${this.end()}ms`)
    }
}

export function startTimer(): Timer {
    return new Timer()
}

/**
 * Error logger shorthand
 * Usage:
 *   logError(req, "User create failed", error, { userId })
 */
export function logError(
    req: any,
    message: string,
    error: Error,
    metadata?: any
) {
    const logger = new SafeLogger(req.scope.resolve("logger"))
    const context = getLogContext(req)

    logger.error(message, context, {
        error,
        ...metadata,
    })
}

/**
 * Info logger shorthand
 */
export function logInfo(req: any, message: string, metadata?: any) {
    const logger = new SafeLogger(req.scope.resolve("logger"))
    const context = getLogContext(req)

    logger.info(message, context, metadata)
}

/**
 * Warn logger shorthand
 */
export function logWarn(req: any, message: string, metadata?: any) {
    const logger = new SafeLogger(req.scope.resolve("logger"))
    const context = getLogContext(req)

    logger.warn(message, context, metadata)
}
