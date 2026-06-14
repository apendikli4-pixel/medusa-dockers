# Admin IP Kısıtlama + Güvenlik İzleme — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin/*` düzlemini yalnızca tanımlı IP'lere (+ localhost) açan, güvenli devreye-alma modlu bir bekçi middleware ve güvenlik olaylarını kaydedip admin'den görüntületen bir izleme katmanı eklemek.

**Architecture:** `/admin/*` zincirinin başına eklenen `adminIpAllowlist` middleware'i `off|observe|enforce` modlarıyla çalışır. Ortak IP/CIDR mantığı tek bir util'de toplanır (rate-limiter de bunu kullanır). Güvenlik olayları in-memory halka tamponda tutulur ve `GET /admin/security/events` ile okunur.

**Tech Stack:** Medusa v2 (`@medusajs/framework/http`, `@medusajs/framework/zod`), TypeScript (strict), Jest + ts-jest.

**Spec:** `docs/superpowers/specs/2026-06-15-admin-ip-restriction-monitoring-design.md`

---

## Notlar (her task için geçerli)
- Test çalıştırma: `npx jest <path>` (host'ta yalnızca type-check/test sanctioned; `npm install` YASAK).
- Tip kontrolü: `node_modules/.bin/tsc --noEmit`.
- Yeni kod proje kurallarına uyar: zod ile route doğrulama, yanıtta iç-detay sızdırma yok, `model.number()` (DB yok bu planda).
- Commit mesajları küçük ve sık.

---

## Task 0: Özellik dalı oluştur

- [ ] **Step 1: main güncel mi bak, dal aç**

Run:
```bash
git checkout -b feat/admin-ip-restriction
```
Expected: `Switched to a new branch 'feat/admin-ip-restriction'`

---

## Task 1: Paylaşılan IP izin-listesi util'i

**Files:**
- Create: `src/lib/ip-allowlist.ts`
- Test: `src/lib/__tests__/ip-allowlist.spec.ts`

- [ ] **Step 1: Failing test yaz**

`src/lib/__tests__/ip-allowlist.spec.ts`:
```typescript
import { normalizeIp, isLoopback, isIpAllowed, parseIpList, getRequestIp } from "../ip-allowlist"

describe("ip-allowlist util", () => {
    test("normalizeIp IPv4-mapped IPv6 önekini soyar ve trimler", () => {
        expect(normalizeIp("::ffff:127.0.0.1")).toBe("127.0.0.1")
        expect(normalizeIp("  1.2.3.4 ")).toBe("1.2.3.4")
        expect(normalizeIp("")).toBe("")
    })

    test("isLoopback localhost'u tanır", () => {
        expect(isLoopback("127.0.0.1")).toBe(true)
        expect(isLoopback("::1")).toBe(true)
        expect(isLoopback("::ffff:127.0.0.1")).toBe(true)
        expect(isLoopback("10.0.0.5")).toBe(false)
    })

    test("isIpAllowed tam eşleşme", () => {
        expect(isIpAllowed("1.2.3.4", ["1.2.3.4"])).toBe(true)
        expect(isIpAllowed("1.2.3.5", ["1.2.3.4"])).toBe(false)
    })

    test("isIpAllowed IPv4 CIDR", () => {
        expect(isIpAllowed("10.0.0.5", ["10.0.0.0/24"])).toBe(true)
        expect(isIpAllowed("10.0.1.5", ["10.0.0.0/24"])).toBe(false)
        expect(isIpAllowed("192.168.1.50", ["192.168.0.0/16"])).toBe(true)
    })

    test("isIpAllowed boş liste → false", () => {
        expect(isIpAllowed("1.2.3.4", [])).toBe(false)
    })

    test("parseIpList virgülle ayrılmış girişi temizler", () => {
        expect(parseIpList("1.2.3.4, 10.0.0.0/24 ,")).toEqual(["1.2.3.4", "10.0.0.0/24"])
        expect(parseIpList(undefined)).toEqual([])
        expect(parseIpList("")).toEqual([])
    })

    test("getRequestIp önce x-forwarded-for, sonra socket", () => {
        expect(getRequestIp({ headers: { "x-forwarded-for": "9.9.9.9, 1.1.1.1" } })).toBe("9.9.9.9")
        expect(getRequestIp({ headers: {}, socket: { remoteAddress: "::ffff:5.5.5.5" } })).toBe("5.5.5.5")
        expect(getRequestIp({ headers: {} })).toBe("")
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/lib/__tests__/ip-allowlist.spec.ts`
Expected: FAIL — "Cannot find module '../ip-allowlist'"

- [ ] **Step 3: Util'i yaz**

`src/lib/ip-allowlist.ts`:
```typescript
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
```

- [ ] **Step 4: Testin geçtiğini doğrula**

Run: `npx jest src/lib/__tests__/ip-allowlist.spec.ts`
Expected: PASS (7 test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ip-allowlist.ts src/lib/__tests__/ip-allowlist.spec.ts
git commit -m "feat(security): paylaşılan IP izin-listesi util'i (CIDR/loopback/parse)"
```

---

## Task 2: rate-limiter ve config'i paylaşılan util'e bağla (DRY)

**Files:**
- Modify: `src/lib/rate-limiter.ts` (`isIpWhitelisted`/`ipToNumber` kaldır, `isIpAllowed` kullan)
- Modify: `src/config/rate-limits.ts` (`ADMIN_WHITELIST_IPS` parse'ını `parseIpList`'e bağla)

- [ ] **Step 1: config'i güncelle**

`src/config/rate-limits.ts` — en üste import ekle:
```typescript
import { parseIpList } from "../lib/ip-allowlist";
```
Dosya sonundaki `ADMIN_WHITELIST_IPS` tanımını şununla değiştir:
```typescript
export const ADMIN_WHITELIST_IPS = parseIpList(process.env.ADMIN_WHITELIST_IPS);
```

- [ ] **Step 2: rate-limiter'ı güncelle**

`src/lib/rate-limiter.ts` — importlara ekle:
```typescript
import { isIpAllowed } from "./ip-allowlist";
```
`isIpWhitelisted` fonksiyonunun **tüm gövdesini** şununla değiştir:
```typescript
function isIpWhitelisted(ip: string): boolean {
    return isIpAllowed(ip, ADMIN_WHITELIST_IPS);
}
```
Ve artık kullanılmayan `ipToNumber` fonksiyonunu (tanımının tamamını) **sil**.

- [ ] **Step 3: Tip kontrolü + tüm testler**

Run: `node_modules/.bin/tsc --noEmit 2>&1 | grep -E "rate-limiter|rate-limits|ip-allowlist" ; echo "ok"`
Expected: yalnızca "ok" (bu dosyalarda hata yok)

Run: `npx jest 2>&1 | tail -5`
Expected: tüm testler PASS (önceki 23 + yeni 7)

- [ ] **Step 4: Commit**

```bash
git add src/lib/rate-limiter.ts src/config/rate-limits.ts
git commit -m "refactor(security): rate-limiter ve config'i paylaşılan ip-allowlist util'ine bağla"
```

---

## Task 3: Güvenlik olay kaydı modülü

**Files:**
- Create: `src/lib/security/security-events.ts`
- Test: `src/lib/security/__tests__/security-events.spec.ts`

- [ ] **Step 1: Failing test yaz**

`src/lib/security/__tests__/security-events.spec.ts`:
```typescript
import { recordSecurityEvent, getRecentSecurityEvents, _clearSecurityEvents } from "../security-events"

describe("security-events", () => {
    beforeEach(() => _clearSecurityEvents())

    test("kayıt eder ve en yeni önce okur", () => {
        recordSecurityEvent("ADMIN_IP_BLOCKED", { ip: "1.1.1.1" })
        recordSecurityEvent("ADMIN_IP_OBSERVED", { ip: "2.2.2.2" })
        const evs = getRecentSecurityEvents()
        expect(evs).toHaveLength(2)
        expect(evs[0].ip).toBe("2.2.2.2")
        expect(evs[0].type).toBe("ADMIN_IP_OBSERVED")
        expect(typeof evs[0].timestamp).toBe("string")
    })

    test("tip filtresi", () => {
        recordSecurityEvent("ADMIN_IP_BLOCKED", { ip: "1.1.1.1" })
        recordSecurityEvent("RATE_LIMIT_EXCEEDED", { ip: "2.2.2.2" })
        const evs = getRecentSecurityEvents({ type: "RATE_LIMIT_EXCEEDED" })
        expect(evs).toHaveLength(1)
        expect(evs[0].ip).toBe("2.2.2.2")
    })

    test("halka tampon 500'de sınırlanır", () => {
        for (let i = 0; i < 600; i++) recordSecurityEvent("ADMIN_IP_OBSERVED", { ip: `0.0.0.${i % 256}` })
        expect(getRecentSecurityEvents({ limit: 500 })).toHaveLength(500)
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/lib/security/__tests__/security-events.spec.ts`
Expected: FAIL — "Cannot find module '../security-events'"

- [ ] **Step 3: Modülü yaz**

`src/lib/security/security-events.ts`:
```typescript
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
```

- [ ] **Step 4: Testin geçtiğini doğrula**

Run: `npx jest src/lib/security/__tests__/security-events.spec.ts`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/security/security-events.ts src/lib/security/__tests__/security-events.spec.ts
git commit -m "feat(security): güvenlik olay kaydı (halka tampon + yapılandırılmış log)"
```

---

## Task 4: Admin IP bekçi middleware'i

**Files:**
- Create: `src/api/middlewares/admin-ip-allowlist.ts`
- Test: `src/api/middlewares/__tests__/admin-ip-allowlist.spec.ts`

- [ ] **Step 1: Failing test yaz**

`src/api/middlewares/__tests__/admin-ip-allowlist.spec.ts`:
```typescript
import { adminIpAllowlistMiddleware } from "../admin-ip-allowlist"
import { _clearSecurityEvents, getRecentSecurityEvents } from "../../../lib/security/security-events"

function mockRes() {
    const res: any = { statusCode: 0, body: null }
    res.status = (c: number) => { res.statusCode = c; return res }
    res.json = (b: any) => { res.body = b; return res }
    return res
}

describe("adminIpAllowlistMiddleware", () => {
    const OLD_ENV = process.env
    beforeEach(() => { _clearSecurityEvents(); process.env = { ...OLD_ENV } })
    afterAll(() => { process.env = OLD_ENV })

    test("off modu → next, engelleme yok", async () => {
        process.env.ADMIN_IP_RESTRICTION_MODE = "off"
        const next = jest.fn()
        const res = mockRes()
        await adminIpAllowlistMiddleware(
            { headers: {}, socket: { remoteAddress: "9.9.9.9" }, path: "/admin/x" } as any, res as any, next as any
        )
        expect(next).toHaveBeenCalled()
        expect(res.statusCode).toBe(0)
    })

    test("observe modu → next + ADMIN_IP_OBSERVED olayı", async () => {
        process.env.ADMIN_IP_RESTRICTION_MODE = "observe"
        const next = jest.fn()
        await adminIpAllowlistMiddleware(
            { headers: { "x-forwarded-for": "9.9.9.9" }, path: "/admin/x", method: "GET" } as any, mockRes() as any, next as any
        )
        expect(next).toHaveBeenCalled()
        const evs = getRecentSecurityEvents()
        expect(evs[0].type).toBe("ADMIN_IP_OBSERVED")
        expect(evs[0].ip).toBe("9.9.9.9")
    })

    test("enforce + izinli IP → next", async () => {
        process.env.ADMIN_IP_RESTRICTION_MODE = "enforce"
        process.env.ADMIN_WHITELIST_IPS = "9.9.9.9"
        const next = jest.fn()
        const res = mockRes()
        await adminIpAllowlistMiddleware(
            { headers: { "x-forwarded-for": "9.9.9.9" }, path: "/admin/x" } as any, res as any, next as any
        )
        expect(next).toHaveBeenCalled()
        expect(res.statusCode).toBe(0)
    })

    test("enforce + loopback → next (liste boş olsa bile)", async () => {
        process.env.ADMIN_IP_RESTRICTION_MODE = "enforce"
        process.env.ADMIN_WHITELIST_IPS = ""
        const next = jest.fn()
        await adminIpAllowlistMiddleware(
            { headers: {}, socket: { remoteAddress: "127.0.0.1" }, path: "/admin/x" } as any, mockRes() as any, next as any
        )
        expect(next).toHaveBeenCalled()
    })

    test("enforce + izinsiz IP → 403 + ADMIN_IP_BLOCKED olayı", async () => {
        process.env.ADMIN_IP_RESTRICTION_MODE = "enforce"
        process.env.ADMIN_WHITELIST_IPS = "1.1.1.1"
        const next = jest.fn()
        const res = mockRes()
        await adminIpAllowlistMiddleware(
            { headers: { "x-forwarded-for": "9.9.9.9" }, path: "/admin/x", method: "POST" } as any, res as any, next as any
        )
        expect(next).not.toHaveBeenCalled()
        expect(res.statusCode).toBe(403)
        expect(getRecentSecurityEvents()[0].type).toBe("ADMIN_IP_BLOCKED")
    })

    test("enforce + IP belirlenemez → 403 (fail-closed)", async () => {
        process.env.ADMIN_IP_RESTRICTION_MODE = "enforce"
        process.env.ADMIN_WHITELIST_IPS = "1.1.1.1"
        const next = jest.fn()
        const res = mockRes()
        await adminIpAllowlistMiddleware(
            { headers: {}, path: "/admin/x" } as any, res as any, next as any
        )
        expect(next).not.toHaveBeenCalled()
        expect(res.statusCode).toBe(403)
    })
})
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npx jest src/api/middlewares/__tests__/admin-ip-allowlist.spec.ts`
Expected: FAIL — "Cannot find module '../admin-ip-allowlist'"

- [ ] **Step 3: Middleware'i yaz**

`src/api/middlewares/admin-ip-allowlist.ts`:
```typescript
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
```

- [ ] **Step 4: Testin geçtiğini doğrula**

Run: `npx jest src/api/middlewares/__tests__/admin-ip-allowlist.spec.ts`
Expected: PASS (6 test)

- [ ] **Step 5: Commit**

```bash
git add src/api/middlewares/admin-ip-allowlist.ts src/api/middlewares/__tests__/admin-ip-allowlist.spec.ts
git commit -m "feat(security): admin IP bekçi middleware'i (off/observe/enforce)"
```

---

## Task 5: Middleware'i /admin/* zincirine kaydet

**Files:**
- Modify: `src/api/middlewares.ts`

- [ ] **Step 1: Import ekle**

`src/api/middlewares.ts` — diğer middleware importlarının yanına:
```typescript
import { adminIpAllowlistMiddleware } from "./middlewares/admin-ip-allowlist"
```

- [ ] **Step 2: /admin/* matcher'ını güncelle**

`/admin/*` matcher'ının `middlewares` dizisini, `adminIpAllowlistMiddleware` **ilk** sırada olacak şekilde değiştir:
```typescript
        {
            matcher: "/admin/*",
            middlewares: [adminIpAllowlistMiddleware, globalRateLimiterMiddleware, tenantContextMiddleware, tenantAlsMiddleware, tenantDbGuardMiddleware],
        },
```

- [ ] **Step 3: Tip kontrolü**

Run: `node_modules/.bin/tsc --noEmit 2>&1 | grep -E "middlewares" ; echo "ok"`
Expected: yalnızca "ok"

- [ ] **Step 4: Commit**

```bash
git add src/api/middlewares.ts
git commit -m "feat(security): admin IP bekçisini /admin/* zincirinin başına ekle"
```

---

## Task 6: Admin görüntüleme ucu (GET /admin/security/events)

**Files:**
- Create: `src/api/admin/security/events/route.ts`

- [ ] **Step 1: Route'u yaz**

`src/api/admin/security/events/route.ts`:
```typescript
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { getRecentSecurityEvents } from "../../../../lib/security/security-events"

const QuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(500).default(100),
    type: z
        .enum(["ADMIN_IP_BLOCKED", "ADMIN_IP_OBSERVED", "INJECTION_BLOCKED", "RATE_LIMIT_EXCEEDED"])
        .optional(),
})

/**
 * GET /admin/security/events
 * Son güvenlik olaylarını döndürür (en yeni önce). Admin-auth + (enforce'ta) IP korumalı.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const parsed = QuerySchema.safeParse(req.query)
    if (!parsed.success) {
        return res.status(400).json({ error: "Geçersiz istek", details: parsed.error.issues })
    }
    const events = getRecentSecurityEvents(parsed.data)
    return res.status(200).json({ count: events.length, events })
}
```

- [ ] **Step 2: Tip kontrolü**

Run: `node_modules/.bin/tsc --noEmit 2>&1 | grep -E "security/events" ; echo "ok"`
Expected: yalnızca "ok"

- [ ] **Step 3: Commit**

```bash
git add src/api/admin/security/events/route.ts
git commit -m "feat(security): GET /admin/security/events görüntüleme ucu"
```

---

## Task 7: Mevcut blok noktalarından güvenlik olayı yay

**Files:**
- Modify: `src/lib/rate-limiter.ts` (429 → RATE_LIMIT_EXCEEDED)
- Modify: `src/modules/ayna/services/chat-service.ts` (injection bloğu → INJECTION_BLOCKED)

- [ ] **Step 1: rate-limiter'a olay ekle**

`src/lib/rate-limiter.ts` — importlara ekle:
```typescript
import { recordSecurityEvent } from "./security/security-events";
```
Redis yolundaki 429 bloğunda, `res.status(429).json(...)` çağrısından **hemen önce** ekle:
```typescript
            recordSecurityEvent("RATE_LIMIT_EXCEEDED", {
                ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress || "",
                path: req.path,
                method: req.method,
                actor: clientId,
            });
```
Aynısını in-memory yol (`applyRateLimitInMemory`) içindeki `res.status(429).json(...)` çağrısından **hemen önce** de ekle.

- [ ] **Step 2: chat-service'e olay ekle**

`src/modules/ayna/services/chat-service.ts` — importlara ekle:
```typescript
import { recordSecurityEvent } from "../../../lib/security/security-events"
```
`if (injectionResult.isMalicious) {` bloğunun içinde, mevcut `this.logger_.warn(...)` çağrısından **hemen sonra** ekle:
```typescript
            recordSecurityEvent("INJECTION_BLOCKED", {
                ip: "",
                path: "/ayna/chat",
                actor: options.customerId || "anonymous",
                details: { riskScore: injectionResult.riskScore, isAdmin: options.isAdmin || false },
            })
```

- [ ] **Step 3: Tip kontrolü + tüm testler**

Run: `node_modules/.bin/tsc --noEmit 2>&1 | grep -E "rate-limiter|chat-service" ; echo "ok"`
Expected: yalnızca "ok"

Run: `npx jest 2>&1 | tail -5`
Expected: tüm testler PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/rate-limiter.ts src/modules/ayna/services/chat-service.ts
git commit -m "feat(security): rate-limit ve injection bloklarını güvenlik olayı olarak yay"
```

---

## Task 8: Ortam değişkeni dokümantasyonu

**Files:**
- Modify: `.env.template` (varsa) — yoksa bu task'ı atla ve AGENTS.md'ye not ekle

- [ ] **Step 1: .env.template var mı kontrol et**

Run: `ls -la .env.template .env.example 2>/dev/null ; echo "---"`
Expected: dosya listesi veya boş

- [ ] **Step 2: Mevcutsa örnek değişkenleri ekle**

`.env.template` (veya `.env.example`) sonuna ekle:
```
# ── Admin IP Kısıtlama (güvenlik) ──
# Mod: off (kapalı) | observe (sadece logla) | enforce (izinsizi 403'le)
ADMIN_IP_RESTRICTION_MODE=off
# İzinli IP/CIDR listesi (virgülle). localhost zaten daima izinli.
# Örn: 88.99.100.101,10.0.0.0/24
ADMIN_WHITELIST_IPS=
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs(security): admin IP kısıtlama .env örnek değişkenleri"
```

---

## Task 9: Bütünsel doğrulama

- [ ] **Step 1: Tam tip kontrolü (dokunulan dosyalar temiz)**

Run:
```bash
node_modules/.bin/tsc --noEmit 2>&1 | grep -E "ip-allowlist|security-events|admin-ip-allowlist|security/events|rate-limiter|rate-limits|chat-service|api/middlewares" ; echo "--- temiz ise üst satır boş ---"
```
Expected: dokunulan dosyalarda hata yok

- [ ] **Step 2: Tüm test paketi**

Run: `npx jest 2>&1 | tail -8`
Expected: tüm suite PASS (önceki + yeni ~16 test)

- [ ] **Step 3: Güvenli devreye-alma talimatını özetle (kullanıcıya)**

Kullanıcıya 3 adımı hatırlat: (1) `.env`'de `ADMIN_IP_RESTRICTION_MODE=observe` + konteyneri yeniden başlat, (2) admine birkaç kez gir, `GET /admin/security/events`'ten görülen IP'yi oku ve `ADMIN_WHITELIST_IPS`'e ekle, (3) `enforce`'a geçir ve yeniden test et.

---

## Self-Review Sonucu (plan yazarı)

- **Spec kapsamı:** §4.1→T1, §4.1 refactor→T2, §4.3→T3, §4.2→T4, §4.5→T5, §4.4→T6, §4.6→T7, §5 env→T8, §8 testler→T1/T3/T4, §6 güvenli devreye-alma→T9.Step3. Tümü kapsanıyor.
- **Placeholder taraması:** Yok — tüm kod blokları somut.
- **Tip tutarlılığı:** `recordSecurityEvent(type, data)`, `getRecentSecurityEvents({limit,type})`, `isIpAllowed(ip,list)`, `getRequestIp(req)`, `parseIpList(raw)`, `isLoopback(ip)`, `adminIpAllowlistMiddleware(req,res,next)` — tüm tasklarda aynı imza.
- **Bilinçli sınır:** Route (T6) için jest yerine tsc + manuel doğrulama (Medusa runtime gerektirir); spec §9 ile uyumlu.
