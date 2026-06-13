import { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { applyRateLimit, createRateLimiter } from "../../lib/rate-limiter"
import { RATE_LIMITS } from "../../config/rate-limits"

const storeLimiter = createRateLimiter(RATE_LIMITS.globalStore.limit)
const adminLimiter = createRateLimiter(RATE_LIMITS.globalAdmin.limit)

const EXEMPT_PATHS = [
    "/health",
    "/admin/auth",
    "/store/payment/paytr/webhook",
    "/store/payment/iyzico/webhook"
]

/**
 * Global Rate Limit Gateway Middleware
 * 
 * Intercepts all requests and applies sliding-window Redis rate limits.
 * Protects the entire Medusa backend from DDoS, bot spam, and abuse.
 */
export async function globalRateLimiterMiddleware(
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
) {
    // ── VARSAYILAN KAPALI (opt-in) ──
    // Bu global geçit IP bazında limitler. Ama topolojimizde storefront SSR tüm anonim
    // /store/* çağrılarını TEK container IP'sinden yapar → açıkken 100/dk sınırı TÜM siteyi
    // throttle edip herkese 429 verebilir (canlı kesintisi). Hassas uçlar (chat, auth, arama)
    // zaten kendi route-bazlı limiter'larıyla korunur. Açmadan önce SSR gerçek istemci IP'sini
    // (X-Forwarded-For) iletmeli VEYA muaf tutulmalı. Açmak için: GLOBAL_RATE_LIMIT_ENABLED=true
    if (process.env.GLOBAL_RATE_LIMIT_ENABLED !== "true") {
        return next()
    }

    const path = req.path || req.url

    // Skip exempt paths
    for (const exemptPath of EXEMPT_PATHS) {
        if (path.startsWith(exemptPath)) {
            return next()
        }
    }

    try {
        let isBlocked = false

        if (path.startsWith("/admin")) {
            // Apply admin limits
            isBlocked = await applyRateLimit(req, res, adminLimiter)
        } else if (path.startsWith("/store")) {
            // Apply store limits
            isBlocked = await applyRateLimit(req, res, storeLimiter)
        }

        // If rate limit is exceeded, applyRateLimit already sent the 429 response
        if (isBlocked) {
            return
        }

        return next()
    } catch (error) {
        // Fail open if rate limiter itself crashes (e.g., Redis down and fallback failed)
        // so we don't bring down the whole API for a limiter bug.
        req.scope.resolve("logger").error(`[GlobalRateLimiter] Error: ${error instanceof Error ? error.message : String(error)}`)
        return next()
    }
}
