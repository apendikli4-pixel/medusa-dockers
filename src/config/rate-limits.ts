/**
 * Rate Limit Configuration
 * Defines rate limiting policies for different API endpoints
 */

export interface RateLimitConfig {
    /** Maximum number of requests allowed in the time window */
    maxRequests: number;
    /** Time window in milliseconds */
    windowMs: number;
    /** Custom error message when limit is exceeded */
    message?: string;
    /** Whether to skip rate limiting for whitelisted IPs */
    skipOnWhitelist?: boolean;
}

export interface RateLimitGroup {
    /** Human-readable name for this rate limit group */
    name: string;
    /** Rate limit configuration */
    limit: RateLimitConfig;
}

/**
 * Rate limit definitions per endpoint group
 */
export const RATE_LIMITS = {
    /**
     * Customer-facing AI chat endpoint
     * 20 requests per 15 minutes per authenticated user or IP
     */
    storeAynaChat: {
        name: "Customer AI Chat",
        limit: {
            maxRequests: 20,
            windowMs: 15 * 60 * 1000, // 15 minutes
            message: "Çok fazla istek gönderildi. Lütfen 15 dakika sonra tekrar deneyin.",
        },
    } as RateLimitGroup,

    /**
     * Store search endpoint
     * 100 requests per 15 minutes per IP
     */
    storeSearch: {
        name: "Store Search",
        limit: {
            maxRequests: 100,
            windowMs: 15 * 60 * 1000, // 15 minutes
            message: "Arama limiti aşıldı. Lütfen 15 dakika sonra tekrar deneyin.",
        },
    } as RateLimitGroup,

    /**
     * Admin panel endpoints
     * 200 requests per 15 minutes per authenticated admin
     */
    admin: {
        name: "Admin Panel",
        limit: {
            maxRequests: 200,
            windowMs: 15 * 60 * 1000, // 15 minutes
            message: "Çok fazla istek gönderildi. Lütfen 15 dakika sonra tekrar deneyin.",
            skipOnWhitelist: true,
        },
    } as RateLimitGroup,

    /**
     * Legacy AI limiter (1 minute window, kept for backward compatibility)
     */
    ai: {
        name: "AI General",
        limit: {
            maxRequests: 10,
            windowMs: 60 * 1000, // 1 minute
            message: "AI isteği limiti aşıldı. Lütfen 1 dakika sonra tekrar deneyin.",
        },
    } as RateLimitGroup,

    /**
     * Content generation limiter
     */
    content: {
        name: "Content Generation",
        limit: {
            maxRequests: 5,
            windowMs: 60 * 1000, // 1 minute
            message: "İçerik oluşturma limiti aşıldı. Lütfen 1 dakika sonra tekrar deneyin.",
        },
    } as RateLimitGroup,

    /**
     * Search limiter (legacy, 1 minute window)
     */
    search: {
        name: "Search General",
        limit: {
            maxRequests: 30,
            windowMs: 60 * 1000, // 1 minute
            message: "Arama limiti aşıldı. Lütfen 1 dakika sonra tekrar deneyin.",
        },
    } as RateLimitGroup,
} as const;

/**
 * Admin IP whitelist for bypassing admin rate limits
 * Can be configured via ADMIN_WHITELIST_IPS environment variable
 * Format: comma-separated list of IP addresses or CIDR ranges
 * Example: "192.168.1.1,10.0.0.0/24,2001:db8::1"
 */
export const ADMIN_WHITELIST_IPS = process.env.ADMIN_WHITELIST_IPS
    ? process.env.ADMIN_WHITELIST_IPS
          .split(",")
          .map((ip) => ip.trim())
          .filter((ip) => ip.length > 0)
    : [];

/**
 * Redis key prefix for rate limit entries
 */
export const RATE_LIMIT_REDIS_PREFIX = "rl:";