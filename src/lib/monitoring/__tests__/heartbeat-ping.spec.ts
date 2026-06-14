import { buildPingUrl, pingMonitor } from "../heartbeat-ping"

describe("buildPingUrl", () => {
    it("başarıda temel URL'i döndürür", () => {
        expect(buildPingUrl("https://hc-ping.com/abc", true)).toBe("https://hc-ping.com/abc")
    })
    it("başarısızlıkta /fail ekler", () => {
        expect(buildPingUrl("https://hc-ping.com/abc", false)).toBe("https://hc-ping.com/abc/fail")
    })
    it("sondaki '/' temizlenir", () => {
        expect(buildPingUrl("https://hc-ping.com/abc/", true)).toBe("https://hc-ping.com/abc")
        expect(buildPingUrl("https://hc-ping.com/abc/", false)).toBe("https://hc-ping.com/abc/fail")
    })
})

describe("pingMonitor", () => {
    it("baseUrl yoksa sessizce atlar (false döner, hata fırlatmaz)", async () => {
        await expect(pingMonitor(undefined, true)).resolves.toBe(false)
        await expect(pingMonitor("", true)).resolves.toBe(false)
    })
    it("ping başarısız olsa bile fırlatmaz (savunmacı)", async () => {
        // Erişilemez host → fetch reject; pingMonitor yutar ve false döner, job bozulmaz.
        const warned: string[] = []
        const r = await pingMonitor("http://127.0.0.1:0/x", true, { warn: (m) => warned.push(m) })
        expect(r).toBe(false)
        expect(warned.length).toBeGreaterThan(0)
    })
})
