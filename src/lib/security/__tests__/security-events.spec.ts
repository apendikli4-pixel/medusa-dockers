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
