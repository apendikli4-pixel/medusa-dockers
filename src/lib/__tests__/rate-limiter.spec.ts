/**
 * Rate Limiter Tests
 * Tests for Redis-backed rate limiting with sliding window
 */

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createRateLimiter, applyRateLimit } from "../rate-limiter";
import type { RateLimitConfig } from "../../config/rate-limits";

// Mock response object
const createMockRes = () => {
    const res: any = {};
    res.setHeader = vi.fn();
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

// Mock request object
const createMockReq = (overrides: any = {}) => ({
    path: "/test",
    url: "/test",
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
    auth_context: undefined,
    auth: undefined,
    ...overrides,
});

describe("Rate Limiter - createRateLimiter", () => {
    it("should create a rate limiter with given config", () => {
        const config: RateLimitConfig = {
            windowMs: 60000,
            maxRequests: 10,
            message: "Too many requests",
        };
        const limiter = createRateLimiter(config);

        expect(limiter.windowMs).toBe(60000);
        expect(limiter.maxRequests).toBe(10);
        expect(limiter.message).toBe("Too many requests");
    });

    it("should default message when not provided", () => {
        const config: RateLimitConfig = {
            windowMs: 60000,
            maxRequests: 10,
        };
        const limiter = createRateLimiter(config);

        expect(limiter.message).toBe("Too many requests, please try again later.");
    });
});

describe("Rate Limiter - applyRateLimit (in-memory fallback)", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should allow requests under the limit", async () => {
        const config: RateLimitConfig = {
            windowMs: 60000,
            maxRequests: 5,
            message: "Rate limit exceeded",
        };

        const req = createMockReq({ path: "/test1", url: "/test1" });
        const res = createMockRes();

        const blocked1 = await applyRateLimit(req, res, config);
        expect(blocked1).toBe(false);
        expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", "5");
        expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", "4");

        const blocked2 = await applyRateLimit(
            createMockReq({ path: "/test1", url: "/test1" }),
            res,
            config
        );
        expect(blocked2).toBe(false);
        expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", "3");
    });

    it("should block requests over the limit", async () => {
        const config: RateLimitConfig = {
            windowMs: 60000,
            maxRequests: 3,
            message: "Too many requests",
        };

        const req = createMockReq({ path: "/test2", url: "/test2" });
        const res = createMockRes();

        // Make 3 requests (allowed)
        for (let i = 0; i < 3; i++) {
            const blocked = await applyRateLimit(req, res, config);
            expect(blocked).toBe(false);
        }

        // 4th request should be blocked
        const blocked = await applyRateLimit(req, res, config);
        expect(blocked).toBe(true);

        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: "RATE_LIMIT_EXCEEDED",
                retryAfter: expect.any(Number),
            })
        );
        expect(res.setHeader).toHaveBeenCalledWith("Retry-After", expect.any(Number));
    });

    it("should key requests separately by different identifiers", async () => {
        const config: RateLimitConfig = {
            windowMs: 60000,
            maxRequests: 2,
            message: "Too many requests",
        };

        const res = createMockRes();

        // User 1 makes 2 requests
        for (let i = 0; i < 2; i++) {
            const req1 = createMockReq({ path: "/test3", url: "/test3" });
            const blocked = await applyRateLimit(req1, res, config);
            expect(blocked).toBe(false);
        }

        // User 1 should be blocked on 3rd request
        const req1 = createMockReq({ path: "/test3", url: "/test3" });
        const blocked1 = await applyRateLimit(req1, res, config);
        expect(blocked1).toBe(true);

        // User 2 (different IP) should still be allowed
        const req2 = createMockReq({ 
            path: "/test3", 
            url: "/test3",
            socket: { remoteAddress: "192.168.1.1" },
        });
        const blocked2 = await applyRateLimit(req2, res, config);
        expect(blocked2).toBe(false);
    });

    it("should reset limit after window expires", async () => {
        const config: RateLimitConfig = {
            windowMs: 60000,
            maxRequests: 2,
            message: "Too many requests",
        };

        const req = createMockReq({ path: "/test4", url: "/test4" });
        const res = createMockRes();

        // Make 2 requests
        await applyRateLimit(req, res, config);
        await applyRateLimit(req, res, config);

        // 3rd request should be blocked
        let blocked = await applyRateLimit(req, res, config);
        expect(blocked).toBe(true);

        // Fast forward time past window
        vi.advanceTimersByTime(60001);

        // Should be allowed again
        const res2 = createMockRes();
        blocked = await applyRateLimit(req, res2, config);
        expect(blocked).toBe(false);
    });

    it("should handle authenticated user ID", async () => {
        const config: RateLimitConfig = {
            windowMs: 60000,
            maxRequests: 2,
            message: "Too many requests",
        };

        const req = createMockReq({
            path: "/test5",
            url: "/test5",
            auth_context: { actor_id: "user_123" },
        });
        const res = createMockRes();

        const blocked = await applyRateLimit(req, res, config);
        expect(blocked).toBe(false);
        expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", "2");
    });

    it("should set correct rate limit headers", async () => {
        const config: RateLimitConfig = {
            windowMs: 60000,
            maxRequests: 10,
            message: "Too many requests",
        };

        const req = createMockReq({ path: "/test6", url: "/test6" });
        const res = createMockRes();

        await applyRateLimit(req, res, config);

        expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", "10");
        expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", "9");
        expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Reset", expect.any(String));
    });

    it("should handle multiple paths separately", async () => {
        const config: RateLimitConfig = {
            windowMs: 60000,
            maxRequests: 1,
            message: "Too many requests",
        };

        const res = createMockRes();

        const req1 = createMockReq({ path: "/path1", url: "/path1" });
        const blocked1 = await applyRateLimit(req1, res, config);
        expect(blocked1).toBe(false);

        const req2 = createMockReq({ path: "/path2", url: "/path2" });
        const blocked2 = await applyRateLimit(req2, res, config);
        expect(blocked2).toBe(false);

        // Each path should have its own limit
        const blocked1Again = await applyRateLimit(req1, res, config);
        expect(blocked1Again).toBe(true);

        const blocked2Again = await applyRateLimit(req2, res, config);
        expect(blocked2Again).toBe(true);
    });
});
