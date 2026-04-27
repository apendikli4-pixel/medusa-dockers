/**
 * Centralized Error Handler for Medusa v2
 * Provides consistent error logging, formatting, and response handling
 */

// ============================================================================
// ERROR TYPES
// ============================================================================

export enum ErrorCode {
    // 4xx Client Errors
    VALIDATION_ERROR = "VALIDATION_ERROR",
    NOT_FOUND = "NOT_FOUND",
    UNAUTHORIZED = "UNAUTHORIZED",
    FORBIDDEN = "FORBIDDEN",
    CONFLICT = "CONFLICT",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

    // 5xx Server Errors
    INTERNAL_ERROR = "INTERNAL_ERROR",
    DATABASE_ERROR = "DATABASE_ERROR",
    AI_SERVICE_ERROR = "AI_SERVICE_ERROR",
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
}

export interface AppError {
    code: ErrorCode
    message: string
    details?: string
    statusCode: number
    timestamp: string
    requestId?: string
}

export interface ErrorLogEntry {
    code: ErrorCode
    message: string
    details?: string
    stack?: string
    context?: Record<string, any>
    timestamp: string
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class ServiceError extends Error {
    code: ErrorCode
    statusCode: number
    details?: string

    constructor(code: ErrorCode, message: string, details?: string) {
        super(message)
        this.name = "ServiceError"
        this.code = code
        this.details = details
        this.statusCode = getStatusCodeForError(code)
    }
}

// ============================================================================
// ERROR HANDLERS
// ============================================================================

/**
 * Main error handler - logs error and returns formatted response
 */
export function handleError(
    error: unknown,
    context?: Record<string, any>
): AppError {
    const timestamp = new Date().toISOString()

    // Log the error
    logError(error, context)

    // Handle known ServiceError
    if (error instanceof ServiceError) {
        return {
            code: error.code,
            message: error.message,
            details: error.details,
            statusCode: error.statusCode,
            timestamp,
        }
    }

    // Handle native Error
    if (error instanceof Error) {
        // Check for specific error patterns
        if (error.message?.includes("unique") || (error as any).code === "23505") {
            return {
                code: ErrorCode.CONFLICT,
                message: "Bu kayıt zaten mevcut.",
                details: error.message,
                statusCode: 409,
                timestamp,
            }
        }

        if (error.message?.includes("not found")) {
            return {
                code: ErrorCode.NOT_FOUND,
                message: "Kayıt bulunamadı.",
                details: error.message,
                statusCode: 404,
                timestamp,
            }
        }

        // Default to internal error
        return {
            code: ErrorCode.INTERNAL_ERROR,
            message: "Bir hata oluştu.",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
            statusCode: 500,
            timestamp,
        }
    }

    // Unknown error
    return {
        code: ErrorCode.INTERNAL_ERROR,
        message: "Bilinmeyen bir hata oluştu.",
        statusCode: 500,
        timestamp,
    }
}

/**
 * Log error with context
 */
function logError(error: unknown, context?: Record<string, any>): void {
    const timestamp = new Date().toISOString()

    const logEntry: ErrorLogEntry = {
        code: error instanceof ServiceError ? error.code : ErrorCode.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context,
        timestamp,
    }

    // In production, you might want to send this to a logging service
    console.error("[ErrorHandler]", JSON.stringify(logEntry, null, 2))
}

/**
 * Get HTTP status code for error code
 */
function getStatusCodeForError(code: ErrorCode): number {
    const statusMap: Record<ErrorCode, number> = {
        [ErrorCode.VALIDATION_ERROR]: 400,
        [ErrorCode.NOT_FOUND]: 404,
        [ErrorCode.UNAUTHORIZED]: 401,
        [ErrorCode.FORBIDDEN]: 403,
        [ErrorCode.CONFLICT]: 409,
        [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
        [ErrorCode.INTERNAL_ERROR]: 500,
        [ErrorCode.DATABASE_ERROR]: 500,
        [ErrorCode.AI_SERVICE_ERROR]: 503,
        [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
    }
    return statusMap[code] || 500
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a validation error
 */
export function validationError(message: string, details?: string): ServiceError {
    return new ServiceError(ErrorCode.VALIDATION_ERROR, message, details)
}

/**
 * Create a not found error
 */
export function notFoundError(resource: string): ServiceError {
    return new ServiceError(ErrorCode.NOT_FOUND, `${resource} bulunamadı.`)
}

/**
 * Create an AI service error
 */
export function aiServiceError(message: string, details?: string): ServiceError {
    return new ServiceError(ErrorCode.AI_SERVICE_ERROR, message, details)
}

/**
 * Create a database error
 */
export function databaseError(message: string, details?: string): ServiceError {
    return new ServiceError(ErrorCode.DATABASE_ERROR, message, details)
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: AppError): object {
    return {
        error: error.code,
        message: error.message,
        details: error.details,
        timestamp: error.timestamp,
    }
}

// ============================================================================
// API ROUTE HELPER
// ============================================================================

/**
 * Wrapper for API route handlers with automatic error handling
 * 
 * @example
 * export const POST = withErrorHandler(async (req, res) => {
 *     // Your handler code
 *     // Errors will be caught and formatted automatically
 * })
 */
export function withErrorHandler(
    handler: (req: any, res: any) => Promise<any>
) {
    return async (req: any, res: any) => {
        try {
            return await handler(req, res)
        } catch (error) {
            const appError = handleError(error, {
                path: req.url,
                method: req.method,
            })
            return res.status(appError.statusCode).json(formatErrorResponse(appError))
        }
    }
}
