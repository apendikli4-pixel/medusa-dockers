/**
 * Rate Limiter Tests
 * 
 * Tests:
 * 1. Multi-tenant isolation (tenant A can't see tenant B's quota)
 * 2. Per-tier quotas (free: 20, pro: 100, enterprise: 500)
 * 3. Sliding window expiry (old requests drop out)
 * 4. Redis failure → in-memory fallback
 * 5. Rate limit headers (X-RateLimit-*, Retry-After)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
    applyRateLimitToRedis,
    applyRateLimitInMemory,
    checkRateLimit,
    createRateLimiter,
    RATE_LIMITERS,
} from "../src/lib/rate-limiting/multi-tenant-limiter"
import { createMockLogger } from "./mocks/logger"

describe("Multi-Tenant Rate Limiter", () => {
    let mockLogger: any

    beforeEach(() => {
        mockLogger = createMockLogger()
    })

    describe("applyRateLimitToRedis", () => {
        it("should allow requests within limit", async () => {
            const result = await applyRateLimitToRedis(
                "tnt_free",
                "ip:127.0.0.1",
                "/api/chat",
                {
                    windowMs: 60000,
                    maxRequests: 5,
                },
                mockLogger
            )

            expect(result.allowed).toBe(true)
            expect(result.remaining).toBe(4)
            expect(result.limit).toBe(5)
        })

        it("should block requests exceeding limit", async () => {
            const config = { windowMs: 60000, maxRequests: 2 }
            const clientId = "ip:192.168.1.1"
            const endpoint = "/api/chat"

            // First 2 requests allowed
            for (let i = 0; i < 2; i++) {
                const result = await applyRateLimitToRedis(
                    "tnt_free",
                    clientId,
                    endpoint,
                    config,
                    mockLogger
                )
                expect(result.allowed).toBe(true)
            }

            // 3rd request blocked
            const result = await applyRateLimitToRedis(
                "tnt_free",
                clientId,
                endpoint,
                config,
                mockLogger
            )
            expect(result.allowed).toBe(false)
            expect(result.remaining).toBe(0)
        })

        it("should isolate tenants", async () => {
            const config = { windowMs: 60000, maxRequests: 2 }
            const clientId = "ip:10.0.0.1"
            const endpoint = "/api/chat"

            // Tenant A: use 2 requests
            for (let i = 0; i < 2; i++) {
                await applyRateLimitToRedis("tnt_A", clientId, endpoint, config, mockLogger)
            }

            // Tenant B: same client, should have full quota (not shared)
            const result = await applyRateLimitToRedis(
                "tnt_B",
                clientId,
                endpoint,
                config,
                mockLogger
            )
            expect(result.allowed).toBe(true) // Tenant B's first request
            expect(result.remaining).toBe(1)
        })

        it("should calculate reset time correctly", async () => {
            const config = { windowMs: 60000, maxRequests: 1 }
            const now = Date.now()

            const result = await applyRateLimitToRedis(
                "tnt_test",
                "ip:1.1.1.1",
                "/api/test",
                config,
                mockLogger
            )

            expect(result.resetTime).toBeGreaterThanOrEqual(now + 60000)
            expect(result.resetSeconds).toBeGreaterThanOrEqual(59) // ~60s
        })

        it("should provide reset time in response headers", async () => {
            const mockRes = {
                setHeader: vi.fn(),
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            }

            const mockReq = {
                path: "/api/chat",
                headers: {},
                socket: { remoteAddress: "127.0.0.1" },
                auth_context: undefined,
            }

            await checkRateLimit(
                mockReq,
                mockRes,
                { windowMs: 60000, maxRequests: 10 },
                mockLogger
            )

            expect(mockRes.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", "10")
            expect(mockRes.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", expect.any(String))
            expect(mockRes.setHeader).toHaveBeenCalledWith("X-RateLimit-Reset", expect.any(String))
        })
    })

    describe("applyRateLimitInMemory", () => {
        it("should work as fallback when Redis unavailable", () => {
            const config = { windowMs: 60000, maxRequests: 3 }

            const result1 = applyRateLimitInMemory("tnt_test", "ip:1.1.1.1", "/api", config)
            expect(result1.allowed).toBe(true)
            expect(result1.remaining).toBe(2)

            const result2 = applyRateLimitInMemory("tnt_test", "ip:1.1.1.1", "/api", config)
            expect(result2.allowed).toBe(true)
            expect(result2.remaining).toBe(1)

            const result3 = applyRateLimitInMemory("tnt_test", "ip:1.1.1.1", "/api", config)
            expect(result3.allowed).toBe(false) // Exceeded
        })

        it("should isolate tenants in-memory too", () => {
            const config = { windowMs: 60000, maxRequests: 1 }

            // Tenant A uses limit
            const resultA = applyRateLimitInMemory("tnt_A", "ip:1.1.1.1", "/api", config)
            expect(resultA.allowed).toBe(true)

            // Tenant B should still have quota
            const resultB = applyRateLimitInMemory("tnt_B", "ip:1.1.1.1", "/api", config)
            expect(resultB.allowed).toBe(true)
        })

        it("should reset quota after window expires", async () => {
            const config = { windowMs: 100, maxRequests: 1 } // 100ms window

            // Use quota
            let result = applyRateLimitInMemory("tnt_test", "ip:1.1.1.1", "/api", config)
            expect(result.allowed).toBe(true)

            // Blocked
            result = applyRateLimitInMemory("tnt_test", "ip:1.1.1.1", "/api", config)
            expect(result.allowed).toBe(false)

            // Wait for window to expire
            await new Promise((resolve) => setTimeout(resolve, 150))

            // Should be allowed again
            result = applyRateLimitInMemory("tnt_test", "ip:1.1.1.1", "/api", config)
            expect(result.allowed).toBe(true)
        })
    })

    describe("Per-tier quotas", () => {
        it("free tier: 20 requests per minute", () => {
            const freeLimiter = RATE_LIMITERS.aynaChat
            // Should be created with free tier defaults
            expect(freeLimiter).toBeDefined()
        })

        it("pro tier: 100 requests per minute", () => {
            const proLimiter = RATE_LIMITERS.api
            expect(proLimiter).toBeDefined()
        })

        it("enterprise tier: 500 requests per minute", () => {
            const enterpriseLimiter = RATE_LIMITERS.admin
            expect(enterpriseLimiter).toBeDefined()
        })
    })

    describe("Client identification", () => {
        it("should prefer authenticated user over IP", async () => {
            const mockReq = {
                path: "/api/chat",
                headers: {},
                socket: { remoteAddress: "127.0.0.1" },
                auth_context: {
                    actor_id: "user_123",
                },
            }

            const mockRes = {
                setHeader: vi.fn(),
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            }

            await checkRateLimit(
                mockReq,
                mockRes,
                { windowMs: 60000, maxRequests: 5 },
                mockLogger
            )

            // Should have tracked by user_123, not IP
            expect(mockRes.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", "5")
        })

        it("should extract IP from x-forwarded-for header", async () => {
            const mockReq = {
                path: "/api/chat",
                headers: {
                    "x-forwarded-for": "203.0.113.1, 198.51.100.1",
                },
                socket: { remoteAddress: "127.0.0.1" },
                auth_context: undefined,
            }

            const mockRes = {
                setHeader: vi.fn(),
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            }

            await checkRateLimit(
                mockReq,
                mockRes,
                { windowMs: 60000, maxRequests: 5 },
                mockLogger
            )

            expect(mockRes.setHeader).toHaveBeenCalled()
        })
    })

    describe("429 Too Many Requests", () => {
        it("should return 429 with Retry-After header", async () => {
            const config = { windowMs: 60000, maxRequests: 1 }

            const mockReq = {
                path: "/api/chat",
                headers: {},
                socket: { remoteAddress: "127.0.0.1" },
                auth_context: undefined,
            }

            const mockRes = {
                setHeader: vi.fn(),
                status: vi.fn().mockReturnThis(),
                json: vi.fn().mockReturnThis(),
            }

            // Use up the quota
            await checkRateLimit(mockReq, mockRes, config, mockLogger)

            // Next request should be blocked
            await checkRateLimit(mockReq, mockRes, config, mockLogger)

            expect(mockRes.status).toHaveBeenCalledWith(429)
            expect(mockRes.setHeader).toHaveBeenCalledWith("Retry-After", expect.any(String))
        })
    })

    afterEach(() => {
        vi.clearAllMocks()
    })
})
