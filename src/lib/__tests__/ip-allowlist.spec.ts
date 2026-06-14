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
