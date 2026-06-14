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
