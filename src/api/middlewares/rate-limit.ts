/**
 * Rate Limit Middleware for Medusa v2 API
 * Express-style middleware wrapper for rate limiting
 * Supports per-endpoint rate limits with Redis-backed storage
 */

import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { applyRateLimit } from "../../lib/rate-limiter";
import { RATE_LIMITS } from "../../config/rate-limits";
import logger from "../../lib/logger";

/**
 * Medusa V2.15: `Middleware` tipi @medusajs/framework/types'tan kaldırıldı.
 * Yeni yaklaşım: handler fonksiyon imzası direkt MedusaRequest/Response/Next
 * parametreleri alır.
 */
type Middleware = (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => void | Promise<void>

/**
 * Creates a rate limit middleware for a specific endpoint group
 *
 * @param group - The rate limit group key (e.g., 'storeAynaChat', 'storeSearch', 'admin')
 * @returns Express-compatible middleware function
 *
 * @example
 * // In your route handler:
 * import { rateLimit } from "../../middlewares/rate-limit"
 * export const POST = [
 *   rateLimit("storeAynaChat"),
 *   async (req, res) => { ... }
 * ]
 */
export function rateLimit(
    group:
        | "storeAynaChat"
        | "storeSearch"
        | "admin"
        | "ai"
        | "content"
        | "search"
): Middleware {
    const config = RATE_LIMITS[group];

    if (!config) {
        logger.error(`[RateLimit] Unknown rate limit group: ${group}`);
        throw new Error(`Unknown rate limit group: ${group}`);
    }

    const limiter = {
        windowMs: config.limit.windowMs,
        maxRequests: config.limit.maxRequests,
        message: config.limit.message,
        skipOnWhitelist: config.limit.skipOnWhitelist,
    };

    return async function rateLimitMiddleware(req, res, next) {
        try {
            const blocked = await applyRateLimit(req, res, limiter);

            if (blocked) {
                // Response already sent by applyRateLimit
                return;
            }

            // Continue to next middleware
            return next();
        } catch (error: any) {
            logger.error("[RateLimit] Middleware error", {
                error: error.message,
                path: req.path,
                method: req.method,
            });

            // On error, allow the request through (fail-open)
            // Logging ensures visibility while not breaking functionality
            return next();
        }
    };
}

/**
 * Convenience middleware for store AI chat endpoint
 */
export const storeAynaChatRateLimit = rateLimit("storeAynaChat");

/**
 * Convenience middleware for store search endpoint
 */
export const storeSearchRateLimit = rateLimit("storeSearch");

/**
 * Convenience middleware for admin endpoints
 */
export const adminRateLimit = rateLimit("admin");
