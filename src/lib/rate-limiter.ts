/**
 * Rate Limiter Middleware for Medusa v2
 * Protects AI endpoints from abuse using Redis-backed sliding window
 */

import { getRedisClient, initRedis } from "./redis/client";
import type { RateLimitConfig } from "../config/rate-limits";
import { ADMIN_WHITELIST_IPS, RATE_LIMIT_REDIS_PREFIX } from "../config/rate-limits";
import { isIpAllowed } from "./ip-allowlist";
import logger from "./logger";

interface RateLimitLimiter {
    windowMs: number;
    maxRequests: number;
    message?: string;
}

/**
 * Creates a rate limiter for Medusa API routes
 *
 * @example
 * // In your route file:
 * import { createRateLimiter, applyRateLimit } from "../../lib/rate-limiter"
 *
 * const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 10 })
 *
 * export const POST = async (req, res) => {
 *     const blocked = await applyRateLimit(req, res, limiter)
 *     if (blocked) return
 *     // ... rest of handler
 * }
 */
export function createRateLimiter(config: RateLimitConfig): RateLimitLimiter {
    return {
        windowMs: config.windowMs,
        maxRequests: config.maxRequests,
        message: config.message || "Too many requests, please try again later.",
    };
}

/**
 * Get a unique identifier for the client
 * Prioritizes authenticated user ID, falls back to IP address
 */
function getClientIdentifier(req: any): string {
    // Try to get customer ID if authenticated (Medusa JWT/session)
    const actorId = (req as any).auth_context?.actor_id || req.auth?.actor_id;
    if (actorId) {
        return `customer:${actorId}`;
    }

    // Fall back to IP address
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded
        ? (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : forwarded[0])
        : (req.socket?.remoteAddress as string) || "unknown";

    return `ip:${ip}`;
}

/**
 * Checks if a given IP is in the admin whitelist
 */
function isIpWhitelisted(ip: string): boolean {
    return isIpAllowed(ip, ADMIN_WHITELIST_IPS);
}

/**
 * Apply rate limiting to a request using Redis-backed sliding window
 * Returns true if request is blocked, false if allowed
 */
export async function applyRateLimit(
    req: any,
    res: any,
    config: RateLimitConfig
): Promise<boolean> {
    const now = Date.now();
    const clientId = getClientIdentifier(req);

    // Determine if this is an admin request
    const isAdmin = (req as any).auth_context?.actor_type === "admin" ||
                    (req as any).auth_context?.actor_id?.startsWith("admin_") ||
                    req.path?.startsWith("/admin");

    // Check admin whitelist skip
    if (config.skipOnWhitelist && isAdmin) {
        const forwarded = req.headers["x-forwarded-for"];
        const ip = forwarded
            ? (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : forwarded[0])
            : (req.socket?.remoteAddress as string) || "";

        if (isIpWhitelisted(ip)) {
            logger.debug(`[RateLimit] Whitelisted admin IP: ${ip}`, { path: req.path });
            // Set headers even for whitelisted requests
            setRateLimitHeaders(res, config.maxRequests, config.maxRequests, config.windowMs, now);
            return false; // Allow the request
        }
    }

    const redisKey = `${RATE_LIMIT_REDIS_PREFIX}${clientId}:${req.path || req.url}`;
    const windowMs = config.windowMs;
    const maxRequests = config.maxRequests;
    const windowStart = now - windowMs;

    try {
        // Ensure Redis is initialized
        let redisClient;
        try {
            redisClient = getRedisClient();
        } catch (e) {
            logger.warn("[RateLimit] Redis not initialized, falling back to in-memory");
            return applyRateLimitInMemory(req, res, config);
        }

        // Use Lua script for atomic sliding window operations
        const luaScript = `
            local key = KEYS[1]
            local window_start = tonumber(ARGV[1])
            local now = tonumber(ARGV[2])
            local max_requests = tonumber(ARGV[3])
            local window_ms = tonumber(ARGV[4])

            redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
            redis.call('ZADD', key, now, now)
            local count = redis.call('ZCARD', key)
            redis.call('EXPIRE', key, math.ceil(window_ms / 1000) + 1)

            return {count, max_requests}
        `;

        const result = await redisClient.eval(luaScript, {
            keys: [redisKey],
            arguments: [windowStart.toString(), now.toString(), maxRequests.toString(), windowMs.toString()],
        });

        const [currentCount] = result as [number, number];

        // Calculate remaining and reset time
        const remaining = Math.max(0, maxRequests - currentCount);
        // V2.15: redis v4 zRange options.REV imzası strict; cast ile geçiyoruz
        const oldestEntry = await (redisClient as any).zRange(redisKey, 0, 0, { REV: false });
        const resetTime = oldestEntry.length > 0
            ? parseInt(oldestEntry[0], 10) + windowMs
            : now + windowMs;
        const resetSeconds = Math.ceil((resetTime - now) / 1000);

        // Set rate limit headers
        setRateLimitHeaders(res, maxRequests, remaining, resetTime, now);

        // Check if limit exceeded
        if (currentCount > maxRequests) {
            res.setHeader("Retry-After", resetSeconds);

            const errorMessage = (config.message || "Rate limit exceeded") +
                ` (${resetSeconds}s until reset)`;

            logger.warn("[RateLimit] Limit exceeded", {
                path: req.path,
                method: req.method,
                clientId,
                currentCount,
                maxRequests,
                windowMs,
                resetAfter: resetSeconds,
                ip: req.socket?.remoteAddress,
                userAgent: req.headers["user-agent"],
            });

            res.status(429).json({
                error: "RATE_LIMIT_EXCEEDED",
                message: errorMessage,
                retryAfter: resetSeconds,
                limit: maxRequests,
                windowMs: windowMs,
                resetTime: new Date(resetTime).toISOString(),
            });

            return true;
        }

        logger.debug("[RateLimit] Request allowed", {
            path: req.path,
            clientId,
            currentCount,
            maxRequests,
            remaining,
        });

        return false;
    } catch (error: any) {
        logger.error("[RateLimit] Redis error, falling back to in-memory", {
            error: error.message,
            path: req.path,
        });
        return applyRateLimitInMemory(req, res, config);
    }
}

const memoryStore = new Map<string, { count: number; resetTime: number }>();

function applyRateLimitInMemory(
    req: any,
    res: any,
    config: RateLimitConfig
): boolean {
    const now = Date.now();
    const clientId = getClientIdentifier(req);
    const key = `${clientId}:${req.path || req.url}`;

    let entry = memoryStore.get(key);

    if (!entry || now > entry.resetTime) {
        entry = { count: 1, resetTime: now + config.windowMs };
        memoryStore.set(key, entry);
    } else {
        entry.count++;
    }

    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

    setRateLimitHeaders(res, config.maxRequests, remaining, entry.resetTime, now);

    if (entry.count > config.maxRequests) {
        res.setHeader("Retry-After", resetSeconds);
        logger.warn("[RateLimit] In-memory limit exceeded", {
            path: req.path,
            clientId,
            count: entry.count,
            maxRequests: config.maxRequests,
        });
        res.status(429).json({
            error: "RATE_LIMIT_EXCEEDED",
            message: config.message,
            retryAfter: resetSeconds,
        });
        return true;
    }

    return false;
}

function setRateLimitHeaders(
    res: any,
    limit: number,
    remaining: number,
    resetTime: number,
    now: number
) {
    res.setHeader("X-RateLimit-Limit", limit.toString());
    res.setHeader("X-RateLimit-Remaining", remaining.toString());
    res.setHeader("X-RateLimit-Reset", Math.ceil(resetTime / 1000).toString());
}

export const AI_LIMITER = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: "AI isteklerinde hız limiti aşıldı. Lütfen 1 dakika sonra tekrar deneyin.",
});

export const CONTENT_LIMITER = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5,
    message: "İçerik oluşturma limiti aşıldı. Lütfen 1 dakika sonra tekrar deneyin.",
});

export const SEARCH_LIMITER = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: "Arama limiti aşıldı. Lütfen 1 dakika sonra tekrar deneyin.",
});

export function startRateLimitCleanup(intervalMs: number = 60000) {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of memoryStore.entries()) {
            if (now > entry.resetTime) {
                memoryStore.delete(key);
            }
        }
    }, intervalMs);
}
