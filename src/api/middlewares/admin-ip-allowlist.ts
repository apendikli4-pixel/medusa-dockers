import { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { getRequestIp, isLoopback, isIpAllowed, parseIpList } from "../../lib/ip-allowlist"
import { recordSecurityEvent } from "../../lib/security/security-events"

type RestrictionMode = "off" | "observe" | "enforce"

function getMode(): RestrictionMode {
    const m = (process.env.ADMIN_IP_RESTRICTION_MODE || "off").trim().toLowerCase()
    return m === "observe" || m === "enforce" ? m : "off"
}

/**
 * Admin IP Bekçisi — /admin/* için en öndeki katman.
 *
 * Modlar (.env: ADMIN_IP_RESTRICTION_MODE):
 *   - off      : devre dışı, her istek geçer (varsayılan; kimseyi kilitlemez)
 *   - observe  : engellemez ama her admin isteğinin IP'sini ADMIN_IP_OBSERVED olarak loglar
 *                (güvenli devreye-alma: gerçek görülen IP'yi tespit etmek için)
 *   - enforce  : yalnızca localhost veya ADMIN_WHITELIST_IPS içindeki IP'ler geçer, diğerleri 403
 *
 * localhost (127.x, ::1) DAİMA izinli — koda gömülü acil çıkış.
 * Fail-closed: enforce'ta IP belirlenemezse veya beklenmedik hata olursa → 403.
 */
export async function adminIpAllowlistMiddleware(
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
): Promise<void> {
    const mode = getMode()
    if (mode === "off") return next()

    const ip = getRequestIp(req)
    const path = req.path || req.url
    const method = req.method

    if (mode === "observe") {
        recordSecurityEvent("ADMIN_IP_OBSERVED", { ip, path, method })
        return next()
    }

    // mode === "enforce"
    try {
        const allowlist = parseIpList(process.env.ADMIN_WHITELIST_IPS)
        if (isLoopback(ip) || isIpAllowed(ip, allowlist)) {
            return next()
        }
        recordSecurityEvent("ADMIN_IP_BLOCKED", { ip, path, method })
        res.status(403).json({
            error: "FORBIDDEN",
            message: "Bu kaynağa erişim yetkiniz yok.",
        })
        return
    } catch {
        // Fail-closed: bekçi hata verirse erişimi engelle (güvenli taraf).
        res.status(403).json({
            error: "FORBIDDEN",
            message: "Bu kaynağa erişim yetkiniz yok.",
        })
        return
    }
}
