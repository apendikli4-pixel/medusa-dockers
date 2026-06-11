/**
 * API Error Hierarchy — Type-safe, HTTP-aware error handling
 * 
 * All errors should inherit from ApiError or be caught and wrapped.
 * Ensures consistent JSON responses with:
 * - Proper HTTP status codes (400, 403, 404, 429, 500)
 * - No stack traces or internal paths in response
 * - Request ID for server-side correlation
 * - Client-side actionable messages
 */

export interface ApiErrorOptions {
    statusCode: number;
    code: string;
    message: string;
    details?: any;
    cause?: Error;
    isOperational?: boolean; // true = expected (validation), false = unexpected (crash)
}

export class ApiError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly details?: any;
    readonly cause?: Error;
    readonly isOperational: boolean;

    constructor(options: ApiErrorOptions) {
        super(options.message);
        Object.setPrototypeOf(this, ApiError.prototype);

        this.statusCode = options.statusCode;
        this.code = options.code;
        this.message = options.message;
        this.details = options.details;
        this.cause = options.cause;
        this.isOperational = options.isOperational !== false;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Validation Error (400 Bad Request)
 */
export class ValidationError extends ApiError {
    constructor(message: string, details?: any) {
        super({
            statusCode: 400,
            code: "VALIDATION_ERROR",
            message,
            details,
            isOperational: true,
        });
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

/**
 * Authentication Error (401 Unauthorized)
 */
export class AuthenticationError extends ApiError {
    constructor(message: string = "Authentication required") {
        super({
            statusCode: 401,
            code: "AUTHENTICATION_ERROR",
            message,
            isOperational: true,
        });
        Object.setPrototypeOf(this, AuthenticationError.prototype);
    }
}

/**
 * Authorization Error (403 Forbidden)
 */
export class AuthorizationError extends ApiError {
    constructor(message: string = "Access denied") {
        super({
            statusCode: 403,
            code: "AUTHORIZATION_ERROR",
            message,
            isOperational: true,
        });
        Object.setPrototypeOf(this, AuthorizationError.prototype);
    }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends ApiError {
    constructor(resource: string, id?: string) {
        super({
            statusCode: 404,
            code: "NOT_FOUND",
            message: `${resource} ${id ? `(${id}) ` : ""}not found`,
            isOperational: true,
        });
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

/**
 * Rate Limit Error (429 Too Many Requests)
 */
export class RateLimitError extends ApiError {
    readonly retryAfter: number;

    constructor(message: string, retryAfterSeconds: number) {
        super({
            statusCode: 429,
            code: "RATE_LIMIT_EXCEEDED",
            message,
            isOperational: true,
        });
        this.retryAfter = retryAfterSeconds;
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends ApiError {
    constructor(message: string) {
        super({
            statusCode: 409,
            code: "CONFLICT",
            message,
            isOperational: true,
        });
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}

/**
 * Service Unavailable (503)
 */
export class ServiceUnavailableError extends ApiError {
    constructor(serviceName: string, message?: string) {
        super({
            statusCode: 503,
            code: "SERVICE_UNAVAILABLE",
            message: message || `${serviceName} is currently unavailable`,
            isOperational: false,
        });
        Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
    }
}

/**
 * Internal Server Error (500)
 */
export class InternalError extends ApiError {
    constructor(message: string = "An unexpected error occurred", cause?: Error) {
        super({
            statusCode: 500,
            code: "INTERNAL_ERROR",
            message,
            cause,
            isOperational: false,
        });
        Object.setPrototypeOf(this, InternalError.prototype);
    }
}

/**
 * Check if error is ApiError
 */
export function isApiError(error: any): error is ApiError {
    return error instanceof ApiError;
}
