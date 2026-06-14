/**
 * Paylaşılan IP izin-listesi mantığı.
 * Hem admin IP bekçisi (src/api/middlewares/admin-ip-allowlist.ts) hem de
 * rate-limiter (src/lib/rate-limiter.ts) bunu kullanır — tek kaynak, kopya mantık yok.
 */

/** IPv4-mapped IPv6 önekini soyar ("::ffff:127.0.0.1" → "127.0.0.1") ve trimler. */
export function normalizeIp(ip: string): string {
    if (!ip) return ""
    let out = String(ip).trim()
    if (out.toLowerCase().startsWith("::ffff:")) out = out.slice(7)
    return out
}

/** Virgülle ayrılmış env değerini temiz IP/CIDR listesine çevirir. */
export function parseIpList(raw?: string): string[] {
    if (!raw) return []
    return raw.split(",").map((s) => s.trim()).filter((s) => s.length > 0)
}

/** İstekten gerçek istemci IP'sini çıkarır (proxy header'ları → socket). */
export function getRequestIp(req: any): string {
    const headers = req?.headers || {}
    const fwd = headers["x-forwarded-for"]
    if (fwd) {
        const first = (typeof fwd === "string" ? fwd : fwd[0]).split(",")[0].trim()
        if (first) return normalizeIp(first)
    }
    const realIp = headers["x-real-ip"]
    if (realIp) return normalizeIp(typeof realIp === "string" ? realIp : realIp[0])
    const cf = headers["cf-connecting-ip"]
    if (cf) return normalizeIp(typeof cf === "string" ? cf : cf[0])
    const sock = req?.socket?.remoteAddress
    if (sock) return normalizeIp(sock)
    return ""
}

/** Loopback (kendi makine) mı? Daima izinli — acil çıkış mekanizması. */
export function isLoopback(ip: string): boolean {
    const n = normalizeIp(ip)
    return n === "::1" || n.startsWith("127.")
}

/** IPv4 adresini 32-bit unsigned sayıya çevirir (geçersizse null). */
function ipv4ToNumber(ip: string): number | null {
    const parts = ip.split(".")
    if (parts.length !== 4) return null
    const nums = parts.map((p) => parseInt(p, 10))
    if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return null
    return ((nums[0] << 24) + (nums[1] << 16) + (nums[2] << 8) + nums[3]) >>> 0
}

/** ip, listedeki bir giriş (tam IP / IPv4 CIDR / IPv6 tam) ile eşleşiyor mu? */
export function isIpAllowed(ip: string, list: string[]): boolean {
    if (!ip || !list || list.length === 0) return false
    const target = normalizeIp(ip)
    for (const raw of list) {
        const entry = raw.trim()
        if (!entry) continue
        if (entry === target) return true
        if (entry.includes("/")) {
            const [base, prefixStr] = entry.split("/")
            const prefix = parseInt(prefixStr, 10)
            if (isNaN(prefix) || prefix < 0 || prefix > 32) continue
            const ipNum = ipv4ToNumber(target)
            const baseNum = ipv4ToNumber(base)
            if (ipNum === null || baseNum === null) continue
            const mask = prefix === 0 ? 0 : (~((1 << (32 - prefix)) - 1)) >>> 0
            if (((ipNum & mask) >>> 0) === ((baseNum & mask) >>> 0)) return true
        }
    }
    return false
}
