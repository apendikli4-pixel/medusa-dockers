import { defineMiddlewares, authenticate } from "@medusajs/framework/http"
import { startRateLimitCleanup } from "../lib/rate-limiter"
import { promptSecurityMiddleware } from "./middlewares/prompt-security"

// Rate Limiter temizleyiciyi başlat (Memory Leak önlemi)
startRateLimitCleanup(60000)

/**
 * API Middleware Tanımları
 * Tüm /admin/* route'ları Medusa admin auth ile korunur.
 * /store/* route'ları opsiyonel müşteri auth ile çalışır.
 */
export default defineMiddlewares({
    routes: [
        // Admin route'ları — JWT token zorunlu
        {
            matcher: "/admin/missions*",
            middlewares: [authenticate("admin", ["bearer", "session"])],
        },
        {
            matcher: "/admin/ayna*",
            middlewares: [authenticate("admin", ["bearer", "session"])],
        },
        {
            matcher: "/admin/gemini*",
            middlewares: [authenticate("admin", ["bearer", "session"])],
        },
        {
            matcher: "/admin/generate-content*",
            middlewares: [authenticate("admin", ["bearer", "session"])],
        },
        {
            matcher: "/admin/posts*",
            middlewares: [authenticate("admin", ["bearer", "session"])],
        },
        {
            matcher: "/admin/system-health*",
            middlewares: [authenticate("admin", ["bearer", "session"])],
        },
        {
            matcher: "/admin/setup*",
            middlewares: [authenticate("admin", ["bearer", "session"])],
        },
        {
            matcher: "/admin/wishlist*",
            middlewares: [authenticate("admin", ["bearer", "session"])],
        },
        {
            matcher: "/admin/test-brevo*",
            middlewares: [authenticate("admin", ["bearer", "session"])],
        },
        {
            matcher: "/admin/test-workflow*",
            middlewares: [authenticate("admin", ["bearer", "session"])],
        },
        // Store route'ları — müşteri auth zorunlu
        {
            matcher: "/store/wishlist*",
            middlewares: [authenticate("customer", ["bearer", "session"])],
        },
        {
            matcher: "/store/subscriptions*",
            middlewares: [authenticate("customer", ["bearer", "session"])],
        },
        {
            matcher: "/store/loyalty*",
            middlewares: [authenticate("customer", ["bearer", "session"])],
        },
        {
            matcher: "/store/conscience*",
            middlewares: [authenticate("customer", ["bearer", "session"])],
        },
        // Store route'ları — müşteri auth opsiyonel (customerId için)
        {
            matcher: "/store/ayna*",
            middlewares: [
                authenticate("customer", ["bearer", "session"], { allowUnauthenticated: true }),
                promptSecurityMiddleware
            ],
        },
        {
            matcher: "/store/pool-agent*",
            middlewares: [authenticate("customer", ["bearer", "session"], { allowUnauthenticated: true })],
        },
    ],
})
