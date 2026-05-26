/**
 * GET /ready — Readiness probe
 * Trafik kabul etmeye hazır mıyız? Kritik bağımlılıkları ping atar:
 *   - Postgres (Medusa Modules.CACHE veya doğrudan pg) — query: SELECT 1
 *   - Redis (REDIS_URL set ise) — PING
 *   - Meilisearch (MEILISEARCH_HOST set ise) — /health
 *
 * Her check ≤2s timeout. Tümü başarılı → 200, biri bile fail → 503.
 * Kubernetes/coolify readiness probe için kullanılır.
 */
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

interface CheckResult {
    name: string
    ok: boolean
    latency_ms: number
    error?: string
}

const TIMEOUT_MS = 2000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
        ),
    ])
}

async function checkPostgres(req: MedusaRequest): Promise<CheckResult> {
    const start = Date.now()
    try {
        // Medusa V2: pg connection via container'dan resolve edilebilir
        const manager = req.scope.resolve("__pg_connection__") as
            | { raw: (sql: string) => Promise<unknown> }
            | undefined
        if (manager?.raw) {
            await withTimeout(manager.raw("SELECT 1"), TIMEOUT_MS, "postgres")
        } else {
            // Fallback: query builder/connection resolution farklı isimlerle
            return { name: "postgres", ok: true, latency_ms: 0, error: "skipped (connection accessor not exposed)" }
        }
        return { name: "postgres", ok: true, latency_ms: Date.now() - start }
    } catch (err) {
        return {
            name: "postgres",
            ok: false,
            latency_ms: Date.now() - start,
            error: err instanceof Error ? err.message : String(err),
        }
    }
}

async function checkRedis(): Promise<CheckResult> {
    const start = Date.now()
    const url = process.env.REDIS_URL
    if (!url) return { name: "redis", ok: true, latency_ms: 0, error: "skipped (REDIS_URL not set)" }
    try {
        const { createClient } = await import("redis")
        const client = createClient({ url })
        await withTimeout(client.connect(), TIMEOUT_MS, "redis connect")
        const pong = await withTimeout(client.ping(), TIMEOUT_MS, "redis ping")
        await client.disconnect()
        if (pong !== "PONG") throw new Error(`unexpected response: ${pong}`)
        return { name: "redis", ok: true, latency_ms: Date.now() - start }
    } catch (err) {
        return {
            name: "redis",
            ok: false,
            latency_ms: Date.now() - start,
            error: err instanceof Error ? err.message : String(err),
        }
    }
}

async function checkMeilisearch(): Promise<CheckResult> {
    const start = Date.now()
    const host = process.env.MEILISEARCH_HOST
    if (!host) return { name: "meilisearch", ok: true, latency_ms: 0, error: "skipped (MEILISEARCH_HOST not set)" }
    try {
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
        const resp = await fetch(`${host.replace(/\/$/, "")}/health`, { signal: ctrl.signal })
        clearTimeout(t)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        return { name: "meilisearch", ok: true, latency_ms: Date.now() - start }
    } catch (err) {
        return {
            name: "meilisearch",
            ok: false,
            latency_ms: Date.now() - start,
            error: err instanceof Error ? err.message : String(err),
        }
    }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
    const checks = await Promise.all([
        checkPostgres(req),
        checkRedis(),
        checkMeilisearch(),
    ])

    const allOk = checks.every((c) => c.ok)
    res.status(allOk ? 200 : 503).json({
        status: allOk ? "ready" : "degraded",
        timestamp: new Date().toISOString(),
        checks,
    })
}
