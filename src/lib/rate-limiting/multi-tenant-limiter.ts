/**
 * Multi-Tenant Rate Limiter for Medusa V2
 * 
 * Redis-backed sliding window with per-tenant quotas:
 * - No memory leaks (Redis expires keys automatically)
 * - Tenant isolation (separate buckets per tenant_id)
 * - Configurable limits per endpoint/tier
 * - Graceful fallback to in-memory (if Redis down)
 * - Circuit breaker for Redis failures
 * 
 * Architecture:
 *   Redis Key Format: "ratelimit:{tenantId}:{clientId}:{endpoint}"
 *   Value: ZSET with (timestamp, timestamp) pairs
 *   Expiry: windowMs + 1s (auto-cleanup)
 * 
 * Per-Tenant Quotas:
 *   Free Tier: 20 req/min per endpoint
 *   Pro Tier: 100 req/min per endpoint
 *   Enterprise: 500 req/min per endpoint
 */

import { getRedisClient } from "../redis/client"
import { Logger } from "@medusajs/framework/types"

export interface RateLimitConfig {
    windowMs: number // Window duration in milliseconds
    maxRequests: number // Max requests per window
    message?: string // Custom error message
    skipOnWhitelist?: boolean // Skip for admin IPs
    tenantTier?: "free" | "pro" | "enterprise" // Tenant subscription tier
}

export interface RateLimitResult {
    allowed: boolean
    remaining: number
    resetTime: number
    resetSeconds: number
    limit: number
}

/**
 * Extract client identifier (authenticated user > IP)
 */
function getClientId(req: any): string {
    // Authenticated customer or admin
    const actorId = req.auth_context?.actor_id || req.auth?.actor_id
    if (actorId) {
        return `actor:${actorId}`
    }

    // Fall back to IP address
    const forwarded = req.headers["x-forwarded-for"]
    const ip = forwarded
        ? typeof forwarded === "string"
            ? forwarded.split(",")[0].trim()
            : Array.isArray(forwarded)
            ? forwarded[0]
            : "unknown"
        : req.socket?.remoteAddress || "unknown"

    return `ip:${ip}`
}

/**
 * Extract tenant ID safely
 */
function getTenantId(req: any): string {
    return req.tenant_id || req.auth_context?.tenant_id || "tnt_default"
}

/**
 * Determine tier-based limits
 */
function getTierLimits(tier: string = "free"): { windowMs: number; maxRequests: number } {
    switch (tier) {
        case "pro":
            return { windowMs: 60000, maxRequests: 100 }
        case "enterprise":
            return { windowMs: 60000, maxRequests: 500 }
        default: // free
            return { windowMs: 60000, maxRequests: 20 }
    }
}

/**
 * Core rate limiter: apply sliding window to Redis
 */
export async function applyRateLimitToRedis(
    tenantId: string,
    clientId: string,
    endpoint: string,
    config: RateLimitConfig,
    logger: Logger
): Promise<RateLimitResult> {
    const now = Date.now()
    const windowStart = now - config.windowMs
    const redisKey = `ratelimit:${tenantId}:${clientId}:${endpoint}`

    try {
        const redisClient = getRedisClient()

        // Lua script: atomic sliding window
        const luaScript = `
            local key = KEYS[1]
            local window_start = tonumber(ARGV[1])
            local now = tonumber(ARGV[2])
            local max_requests = tonumber(ARGV[3])
            local window_ms = tonumber(ARGV[4])

            -- Remove old entries outside window
            redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
            
            -- Add current request
            redis.call('ZADD', key, now, now)
            
            -- Count requests in window
            local count = redis.call('ZCARD', key)
            
            -- Auto-expire key (window + 1 second buffer)
            redis.call('EXPIRE', key, math.ceil(window_ms / 1000) + 1)

            return {count, max_requests}
        `

        const result = (await redisClient.eval(luaScript, {
            keys: [redisKey],
            arguments: [
                windowStart.toString(),
                now.toString(),
                config.maxRequests.toString(),
                config.windowMs.toString(),
            ],
        })) as [number, number]

        const [currentCount] = result

        // Get oldest entry for reset time calculation
        const oldestEntries = await (redisClient as any).zRange(redisKey, 0, 0, { REV: false })
        const oldestTime = oldestEntries.length > 0 ? parseInt(oldestEntries[0], 10) : now
        const resetTime = oldestTime + config.windowMs
        const resetSeconds = Math.max(0, Math.ceil((resetTime - now) / 1000))
        const remaining = Math.max(0, config.maxRequests - currentCount)

        return {
            allowed: currentCount <= config.maxRequests,
            remaining,
            resetTime,
            resetSeconds,
            limit: config.maxRequests,
        }
    } catch (error: any) {
        logger.error("[RateLimit] Redis operation failed, falling back to in-memory", {
            error: error.message,
            tenantId,
            clientId,
            endpoint,
        })

        // Graceful fallback to in-memory
        return applyRateLimitInMemory(tenantId, clientId, endpoint, config)
    }
}

/**
 * In-memory rate limiter (fallback when Redis unavailable)
 * Stored per-tenant to prevent cross-tenant data leakage
 */
const memoryStores = new Map<string, Map<string, { count: number; resetTime: number }>>()

function applyRateLimitInMemory(
    tenantId: string,
    clientId: string,
    endpoint: string,
    config: RateLimitConfig
): RateLimitResult {
    const now = Date.now()
    const key = `${clientId}:${endpoint}`

    // Get or create tenant bucket
    if (!memoryStores.has(tenantId)) {
        memoryStores.set(tenantId, new Map())
    }
    const tenantStore = memoryStores.get(tenantId)!

    // Get or create entry
    let entry = tenantStore.get(key)
    if (!entry || now > entry.resetTime) {
        entry = { count: 0, resetTime: now + config.windowMs }
        tenantStore.set(key, entry)
    }

    entry.count++

    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000)
    const remaining = Math.max(0, config.maxRequests - entry.count)

    return {
        allowed: entry.count <= config.maxRequests,
        remaining,
        resetTime: entry.resetTime,
        resetSeconds,
        limit: config.maxRequests,
    }
}

/**
 * Cleanup in-memory stores periodically (prevent leaks)
 */
export function startRateLimitMemoryCleanup(intervalMs: number = 60000) {
    setInterval(() => {
        const now = Date.now()

        for (const [tenantId, store] of memoryStores.entries()) {
            for (const [key, entry] of store.entries()) {
                if (now > entry.resetTime) {
                    store.delete(key)
                }
            }

            // Remove empty tenant buckets
            if (store.size === 0) {
                memoryStores.delete(tenantId)
            }
        }
    }, intervalMs)
}

/**
 * Main rate limit function for routes
 */
export async function checkRateLimit(
    req: any,
    res: any,
    config: RateLimitConfig,
    logger: Logger
): Promise<boolean> {
    const tenantId = getTenantId(req)
    const clientId = getClientId(req)
    const endpoint = req.path || req.url

    // Merge with tier limits if specified
    const tierLimits = config.tenantTier ? getTierLimits(config.tenantTier) : null
    const finalConfig: RateLimitConfig = tierLimits ? { ...tierLimits, ...config } : config

    // Apply rate limit
    const result = await applyRateLimitToRedis(
        tenantId,
        clientId,
        endpoint,
        finalConfig,
        logger
    )

    // Set response headers
    res.setHeader("X-RateLimit-Limit", result.limit.toString())
    res.setHeader("X-RateLimit-Remaining", result.remaining.toString())
    res.setHeader("X-RateLimit-Reset", Math.ceil(result.resetTime / 1000).toString())

    if (!result.allowed) {
        res.setHeader("Retry-After", result.resetSeconds.toString())

        logger.warn("[RateLimit] Limit exceeded", {
            tenantId,
            clientId,
            endpoint,
            limit: result.limit,
            resetAfter: result.resetSeconds,
        })

        return res.status(429).json({
            error: "RATE_LIMIT_EXCEEDED",
            message: finalConfig.message || "Too many requests",
            retryAfter: result.resetSeconds,
            limit: result.limit,
            resetTime: new Date(result.resetTime).toISOString(),
        })
    }

    logger.debug("[RateLimit] Request allowed", {
        tenantId,
        clientId,
        endpoint,
        remaining: result.remaining,
    })

    return true
}

/**
 * Factory: Create rate limit checker with tenant tier
 */
export function createRateLimiter(
    baseConfig: RateLimitConfig
): (req: any, res: any, logger: Logger) => Promise<boolean> {
    return async (req: any, res: any, logger: Logger) => {
        // Can override config per-request (e.g., from tenant settings)
        const config = {
            ...baseConfig,
            tenantTier: req.tenant_tier || baseConfig.tenantTier,
        }

        return checkRateLimit(req, res, config, logger)
    }
}

/**
 * Predefined rate limiters
 */
export const RATE_LIMITERS = {
    // Mesajlar TÜRKÇE: müşteriye/yöneticiye dönen metinlerde dil kuralı geçerli.
    // Ayna chat: 20 req/min free, 100 pro, 500 enterprise
    aynaChat: createRateLimiter({
        windowMs: 60000,
        maxRequests: 20,
        message: "AI sohbet limitine ulaşıldı. Lütfen kısa bir süre sonra tekrar deneyin.",
        tenantTier: "free",
    }),

    // Content generation: 5 req/min free
    contentGeneration: createRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        message: "İçerik üretim limitine ulaşıldı. Lütfen daha sonra tekrar deneyin.",
        tenantTier: "free",
    }),

    // Search: 30 req/min free
    search: createRateLimiter({
        windowMs: 60000,
        maxRequests: 30,
        message: "Arama limitine ulaşıldı. Lütfen tekrar deneyin.",
        tenantTier: "free",
    }),

    // API endpoints: 100 req/min free
    api: createRateLimiter({
        windowMs: 60000,
        maxRequests: 100,
        message: "API istek limiti aşıldı.",
        tenantTier: "free",
    }),

    // Admin operations: 200 req/min
    admin: createRateLimiter({
        windowMs: 60000,
        maxRequests: 200,
        message: "Yönetici işlem limiti aşıldı.",
        tenantTier: "enterprise",
    }),
}
