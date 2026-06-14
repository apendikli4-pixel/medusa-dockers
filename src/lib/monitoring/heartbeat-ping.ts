/**
 * Dış İzleyici Ping'i — "Dead Man's Switch"
 * ══════════════════════════════════════════
 * Kalp atışı (integrity-heartbeat) her çalıştığında DIŞARIDAKİ bir izleme servisine ping atar
 * (Healthchecks.io, Cronitor, Better Uptime — HEARTBEAT_PING_URL env'i). Servis, beklenen aralıkta
 * ping GELMEZSE alarm verir. Yani sunucu/job ölürse (fatura, çökme), uyarı DIŞARIDAN gelir —
 * çünkü in-app izleme sunucu düştüğünde kendisi de ölür. Bu, "kazara fark etme"yi bitirir.
 *
 * Konvansiyon (Healthchecks.io): başarı → <url>, başarısızlık → <url>/fail.
 */
export function buildPingUrl(baseUrl: string, ok: boolean): string {
    const trimmed = baseUrl.replace(/\/+$/, "")
    return ok ? trimmed : `${trimmed}/fail`
}

/**
 * İzleyiciye ping atar. Tamamen savunmacı: ping'in kendisi başarısız olsa bile job'ı bozmaz.
 * baseUrl yoksa sessizce atlanır (özellik opt-in).
 */
export async function pingMonitor(
    baseUrl: string | undefined,
    ok: boolean,
    logger?: { warn: (m: string) => void }
): Promise<boolean> {
    if (!baseUrl) return false
    const url = buildPingUrl(baseUrl, ok)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 10_000)
    try {
        await fetch(url, { method: "POST", signal: ctrl.signal })
        return true
    } catch (e) {
        logger?.warn(`[Heartbeat] izleyici ping başarısız (${url}): ${e instanceof Error ? e.message : e}`)
        return false
    } finally {
        clearTimeout(timer)
    }
}
