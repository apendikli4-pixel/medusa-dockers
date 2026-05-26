/**
 * Rate Limiter Tests (jest)
 * In-memory fallback path — Redis is forced to fail to trigger fallback.
 */

// Redis client'ı in-memory fallback'a zorla
jest.mock("../redis/client", () => ({
    initRedis: jest.fn().mockRejectedValue(new Error("redis disabled in tests")),
    getRedisClient: jest.fn(() => {
        throw new Error("redis disabled in tests");
    }),
}));

import { createRateLimiter, applyRateLimit } from "../rate-limiter";
import type { RateLimitConfig } from "../../config/rate-limits";

const createMockRes = () => {
    const res: any = {};
    res.setHeader = jest.fn();
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const createMockReq = (overrides: any = {}) => ({
    path: "/test",
    url: "/test",
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
    auth_context: undefined,
    auth: undefined,
    ...overrides,
});

describe("createRateLimiter", () => {
    it("creates limiter with given config", () => {
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

    it("defaults the message when not provided", () => {
        const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 10 });
        expect(limiter.message).toBe("Too many requests, please try again later.");
    });
});

describe("applyRateLimit (in-memory fallback)", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.useRealTimers();
    });

    it("allows requests under the limit", async () => {
        const config: RateLimitConfig = { windowMs: 60000, maxRequests: 5, message: "x" };
        const res = createMockRes();

        const blocked1 = await applyRateLimit(
            createMockReq({ path: "/u1", url: "/u1" }),
            res,
            config
        );
        expect(blocked1).toBe(false);
        expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", "5");
        expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", "4");

        const blocked2 = await applyRateLimit(
            createMockReq({ path: "/u1", url: "/u1" }),
            res,
            config
        );
        expect(blocked2).toBe(false);
        expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", "3");
    });

    it("blocks requests over the limit", async () => {
        const config: RateLimitConfig = { windowMs: 60000, maxRequests: 3, message: "Too many" };
        const res = createMockRes();
        const req = createMockReq({ path: "/u2", url: "/u2" });

        for (let i = 0; i < 3; i++) {
            const blocked = await applyRateLimit(req, res, config);
            expect(blocked).toBe(false);
        }

        const blocked = await applyRateLimit(req, res, config);
        expect(blocked).toBe(true);
        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: expect.stringMatching(/RATE_LIMIT/i),
            })
        );
        expect(res.setHeader).toHaveBeenCalledWith("Retry-After", expect.any(Number));
    });

    it("keys requests separately by IP", async () => {
        const config: RateLimitConfig = { windowMs: 60000, maxRequests: 2, message: "x" };
        const res = createMockRes();

        for (let i = 0; i < 2; i++) {
            await applyRateLimit(
                createMockReq({ path: "/u3", url: "/u3" }),
                res,
                config
            );
        }
        const blocked1 = await applyRateLimit(
            createMockReq({ path: "/u3", url: "/u3" }),
            res,
            config
        );
        expect(blocked1).toBe(true);

        // Different IP — should pass
        const blocked2 = await applyRateLimit(
            createMockReq({
                path: "/u3",
                url: "/u3",
                socket: { remoteAddress: "192.168.1.1" },
            }),
            res,
            config
        );
        expect(blocked2).toBe(false);
    });

    it("resets after window expires", async () => {
        const config: RateLimitConfig = { windowMs: 60000, maxRequests: 2, message: "x" };
        const res = createMockRes();
        const req = createMockReq({ path: "/u4", url: "/u4" });

        await applyRateLimit(req, res, config);
        await applyRateLimit(req, res, config);
        expect(await applyRateLimit(req, res, config)).toBe(true);

        jest.advanceTimersByTime(60001);

        const res2 = createMockRes();
        expect(await applyRateLimit(req, res2, config)).toBe(false);
    });

    it("uses authenticated actor_id when present", async () => {
        const config: RateLimitConfig = { windowMs: 60000, maxRequests: 2, message: "x" };
        const res = createMockRes();
        const req = createMockReq({
            path: "/u5",
            url: "/u5",
            auth_context: { actor_id: "user_123" },
        });
        const blocked = await applyRateLimit(req, res, config);
        expect(blocked).toBe(false);
        expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", "2");
    });

    it("emits rate limit headers", async () => {
        const config: RateLimitConfig = { windowMs: 60000, maxRequests: 10, message: "x" };
        const res = createMockRes();
        const req = createMockReq({ path: "/u6", url: "/u6" });
        await applyRateLimit(req, res, config);
        expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", "10");
        expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", "9");
        expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Reset", expect.any(String));
    });

    it("tracks paths independently", async () => {
        const config: RateLimitConfig = { windowMs: 60000, maxRequests: 1, message: "x" };
        const res = createMockRes();

        expect(
            await applyRateLimit(createMockReq({ path: "/a", url: "/a" }), res, config)
        ).toBe(false);
        expect(
            await applyRateLimit(createMockReq({ path: "/b", url: "/b" }), res, config)
        ).toBe(false);

        expect(
            await applyRateLimit(createMockReq({ path: "/a", url: "/a" }), res, config)
        ).toBe(true);
        expect(
            await applyRateLimit(createMockReq({ path: "/b", url: "/b" }), res, config)
        ).toBe(true);
    });
});
