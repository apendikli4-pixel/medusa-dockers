import logger from "../logger"

export type SecurityEventType =
    | "ADMIN_IP_BLOCKED"
    | "ADMIN_IP_OBSERVED"
    | "INJECTION_BLOCKED"
    | "RATE_LIMIT_EXCEEDED"

export interface SecurityEvent {
    timestamp: string
    type: SecurityEventType
    ip: string
    path?: string
    method?: string
    actor?: string
    details?: Record<string, any>
}

const MAX_EVENTS = 500
const ring: SecurityEvent[] = []

/** Güvenlik olayını loglar ve in-memory halka tampona ekler. */
export function recordSecurityEvent(
    type: SecurityEventType,
    data: {
        ip: string
        path?: string
        method?: string
        actor?: string
        details?: Record<string, any>
        timestamp?: string
    }
): SecurityEvent {
    const event: SecurityEvent = {
        timestamp: data.timestamp || new Date().toISOString(),
        type,
        ip: data.ip || "",
        path: data.path,
        method: data.method,
        actor: data.actor,
        details: data.details,
    }
    ring.push(event)
    if (ring.length > MAX_EVENTS) ring.splice(0, ring.length - MAX_EVENTS)
    try {
        logger.warn(`[SECURITY] ${type} ip=${event.ip || "-"} path=${event.path || "-"} method=${event.method || "-"}`)
    } catch {
        // logger çözümlenemezse sessiz devam
    }
    return event
}

/** Son güvenlik olaylarını (en yeni önce) döndürür; tipe göre filtreler. */
export function getRecentSecurityEvents(opts?: { limit?: number; type?: SecurityEventType }): SecurityEvent[] {
    let out = ring
    if (opts?.type) out = out.filter((e) => e.type === opts.type)
    const limit = Math.max(1, Math.min(opts?.limit ?? 100, MAX_EVENTS))
    return out.slice(-limit).reverse()
}

/** Yalnızca testler için tamponu temizler. */
export function _clearSecurityEvents(): void {
    ring.length = 0
}
