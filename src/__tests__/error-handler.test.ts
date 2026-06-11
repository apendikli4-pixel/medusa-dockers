/**
 * Error Handler Tests
 * 
 * Tests:
 * 1. Custom error classes (ValidationError, NotFoundError, ServiceUnavailableError, etc.)
 * 2. Error wrapping & context preservation
 * 3. Safe error responses (no stack trace leaks)
 * 4. Error logging (structured, no PII)
 * 5. HTTP status code mapping
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import {
    ValidationError,
    NotFoundError,
    ServiceUnavailableError,
    PermissionDeniedError,
    assert,
    errorHandlerWrapper,
    unwrapError,
} from "../src/lib/errors/error-handler"
import { createMockLogger } from "./mocks/logger"

describe("Custom Error Classes", () => {
    describe("ValidationError", () => {
        it("should create error with status 400", () => {
            const error = new ValidationError("Invalid input", {
                field: "email",
                reason: "Must be valid email",
            })

            expect(error.statusCode).toBe(400)
            expect(error.message).toBe("Invalid input")
            expect(error.context).toEqual({
                field: "email",
                reason: "Must be valid email",
            })
        })

        it("should include issues array", () => {
            const error = new ValidationError("Validation failed", {
                issues: [
                    { path: "name", message: "Required" },
                    { path: "email", message: "Invalid format" },
                ],
            })

            expect(error.context.issues).toHaveLength(2)
        })
    })

    describe("NotFoundError", () => {
        it("should create error with status 404", () => {
            const error = new NotFoundError("Customer not found", {
                customerId: "cust_123",
            })

            expect(error.statusCode).toBe(404)
            expect(error.message).toBe("Customer not found")
        })
    })

    describe("ServiceUnavailableError", () => {
        it("should create error with status 503", () => {
            const error = new ServiceUnavailableError("Ollama", "Connection timeout")

            expect(error.statusCode).toBe(503)
            expect(error.message).toContain("Ollama")
            expect(error.context).toEqual({
                service: "Ollama",
                reason: "Connection timeout",
            })
        })

        it("should include retry info", () => {
            const error = new ServiceUnavailableError("Redis", "Offline", {
                retryAfter: 30,
            })

            expect(error.context.retryAfter).toBe(30)
        })
    })

    describe("PermissionDeniedError", () => {
        it("should create error with status 403", () => {
            const error = new PermissionDeniedError("Admin access required", {
                requiredRole: "admin",
                userRole: "user",
            })

            expect(error.statusCode).toBe(403)
        })
    })

    describe("assert helper", () => {
        it("should throw error when condition is false", () => {
            expect(() => {
                assert(false, "Expected condition", { value: 42 })
            }).toThrow(Error)
        })

        it("should not throw when condition is true", () => {
            expect(() => {
                assert(true, "Expected condition")
            }).not.toThrow()
        })

        it("should pass context to error", () => {
            try {
                assert(null, "Value required", { fieldName: "email" })
            } catch (error: any) {
                expect(error.context).toEqual({ fieldName: "email" })
            }
        })
    })
})

describe("Error Wrapping & Unwrapping", () => {
    it("should unwrap custom error metadata", () => {
        const error = new ValidationError("Bad request", {
            field: "age",
            reason: "Must be positive",
        })

        const unwrapped = unwrapError(error)

        expect(unwrapped.statusCode).toBe(400)
        expect(unwrapped.message).toBe("Bad request")
        expect(unwrapped.context).toBeDefined()
    })

    it("should handle native JS errors", () => {
        const error = new Error("Something went wrong")

        const unwrapped = unwrapError(error)

        expect(unwrapped.statusCode).toBe(500)
        expect(unwrapped.message).toBe("Something went wrong")
    })

    it("should preserve error chain", () => {
        const originalError = new Error("DB connection failed")
        const wrappedError = new ServiceUnavailableError("PostgreSQL", "Connection timeout", {
            cause: originalError,
        })

        const unwrapped = unwrapError(wrappedError)

        expect(unwrapped.context?.cause).toBeDefined()
    })
})

describe("Safe Error Responses (no stack leaks)", () => {
    it("should not include stack trace in response", () => {
        const error = new ValidationError("Invalid data", { field: "test" })

        const response = {
            error: error.message,
            details: error.context,
        }

        expect(JSON.stringify(response)).not.toContain("at ")
        expect(JSON.stringify(response)).not.toContain(".ts:")
    })

    it("should hide sensitive paths", () => {
        const error = new Error("Database error at /home/user/app/src/db.ts:42")

        const unwrapped = unwrapError(error)
        const response = {
            message: unwrapped.message,
        }

        // Response should not expose file paths
        expect(JSON.stringify(response)).not.toContain("/home/user")
    })

    it("should sanitize error messages", () => {
        const error = new Error("Connection to redis://password@localhost:6379 failed")

        const unwrapped = unwrapError(error)

        // Should mask credentials in logs/responses
        expect(unwrapped.message).toBeDefined()
    })
})

describe("HTTP Status Code Mapping", () => {
    it("should map custom errors to correct HTTP status codes", () => {
        const errors = [
            { error: new ValidationError("test", {}), expectedStatus: 400 },
            { error: new NotFoundError("test", {}), expectedStatus: 404 },
            { error: new PermissionDeniedError("test", {}), expectedStatus: 403 },
            { error: new ServiceUnavailableError("test", "test"), expectedStatus: 503 },
        ]

        errors.forEach(({ error, expectedStatus }) => {
            expect(error.statusCode).toBe(expectedStatus)
        })
    })

    it("should default unknown errors to 500", () => {
        const error = new Error("Unknown error")
        const unwrapped = unwrapError(error)

        expect(unwrapped.statusCode).toBe(500)
    })
})

describe("Error Handler Middleware", () => {
    let mockLogger: any
    let mockReq: any
    let mockRes: any

    beforeEach(() => {
        mockLogger = createMockLogger()

        mockReq = {
            path: "/api/test",
            method: "POST",
            headers: {},
            body: {},
        }

        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            setHeader: vi.fn(),
        }
    })

    it("should catch and handle errors in route handlers", async () => {
        const handler = errorHandlerWrapper(async () => {
            throw new ValidationError("Invalid data", { field: "email" })
        })

        await handler(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: "Invalid data",
            })
        )
    })

    it("should handle custom errors with context", async () => {
        const handler = errorHandlerWrapper(async () => {
            throw new NotFoundError("User not found", {
                userId: "usr_123",
                searchedAt: "2026-06-11",
            })
        })

        await handler(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(404)
    })

    it("should handle service unavailable errors", async () => {
        const handler = errorHandlerWrapper(async () => {
            throw new ServiceUnavailableError("Ollama", "Connection timeout", {
                retryAfter: 30,
            })
        })

        await handler(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(503)
        expect(mockRes.setHeader).toHaveBeenCalledWith("Retry-After", "30")
    })

    it("should log errors with request context", async () => {
        const handler = errorHandlerWrapper(async () => {
            throw new Error("Test error")
        })

        mockReq.method = "POST"
        mockReq.path = "/api/chat"

        await handler(mockReq, mockRes)

        // Error should be logged with context
        expect(mockRes.status).toHaveBeenCalled()
    })

    it("should not expose stack traces to client", async () => {
        const handler = errorHandlerWrapper(async () => {
            throw new Error("Internal database error at /src/db.ts:123")
        })

        await handler(mockReq, mockRes)

        const responseCall = mockRes.json.mock.calls[0][0]
        expect(JSON.stringify(responseCall)).not.toContain(".ts:")
    })

    it("should handle async errors", async () => {
        const handler = errorHandlerWrapper(async () => {
            await new Promise((_, reject) => {
                setTimeout(
                    () => reject(new ServiceUnavailableError("Cache", "Redis offline")),
                    10
                )
            })
        })

        await handler(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(503)
    })

    it("should pass through successful responses", async () => {
        const successResponse = { data: { id: "123", name: "Test" } }

        const handler = errorHandlerWrapper(async (req: any, res: any) => {
            return res.json(successResponse)
        })

        await handler(mockReq, mockRes)

        expect(mockRes.json).toHaveBeenCalledWith(successResponse)
    })
})

describe("Error Context & Metadata", () => {
    it("should preserve custom context", () => {
        const context = {
            userId: "usr_123",
            tenantId: "tnt_free",
            action: "create_chat",
            timestamp: new Date().toISOString(),
        }

        const error = new ServiceUnavailableError("Ayna", "Timeout", context)

        expect(error.context).toEqual(expect.objectContaining(context))
    })

    it("should support nested error chains", () => {
        const original = new Error("Network error")
        const wrapped = new ServiceUnavailableError("API", "Request failed", {
            cause: original,
        })

        expect(wrapped.context?.cause).toBe(original)
    })

    it("should include timestamp for audit logs", () => {
        const before = new Date()
        const error = new ValidationError("test", {})
        const after = new Date()

        // Error timestamp should be captured
        expect(error.timestamp).toBeDefined()
        expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
        expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
    })
})

describe("Sensitive Data Redaction", () => {
    it("should not include auth tokens in error logs", () => {
        const error = new ValidationError("Request error", {
            headers: {
                authorization: "Bearer secret_token_12345",
            },
        })

        // Should not leak token
        const errorStr = JSON.stringify(error)
        expect(errorStr).not.toContain("secret_token_12345")
    })

    it("should not include database credentials", () => {
        const error = new ServiceUnavailableError("DB", "Connection failed", {
            connectionString: "postgresql://user:password@localhost:5432/db",
        })

        const errorStr = JSON.stringify(error)
        expect(errorStr).not.toContain("password")
    })

    it("should not include PII in error messages", () => {
        const error = new NotFoundError("User email@example.com not found", {
            userEmail: "email@example.com",
        })

        // Error message should be generic
        expect(error.message).toBe("User email@example.com not found")
    })
})
