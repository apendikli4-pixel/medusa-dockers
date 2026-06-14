import { isAbandonedCandidate, buildReturnToCartUrl, type AbandonedCartInput } from "../candidate"

const HOUR = 60 * 60 * 1000
const NOW = 1_700_000_000_000 // sabit referans (deterministik)
const OPTS = { minAgeMs: 4 * HOUR, maxAgeMs: 48 * HOUR }

// Geçerli bir aday için temel sepet; testler tek alanı değiştirir.
function cart(overrides: Partial<AbandonedCartInput> = {}): AbandonedCartInput {
    return {
        id: "cart_1",
        email: "musteri@example.com",
        completed_at: null,
        updated_at: NOW - 5 * HOUR, // 5 saat önce → pencere içinde
        items: [{ id: "li_1" }],
        metadata: null,
        ...overrides,
    }
}

describe("isAbandonedCandidate", () => {
    it("pencere içindeki (5s) dolu, email'li, tamamlanmamış sepet UYGUNDUR", () => {
        expect(isAbandonedCandidate(cart(), NOW, OPTS).eligible).toBe(true)
    })

    it("çok yeni sepet (3s59dk) UYGUN DEĞİL", () => {
        const r = isAbandonedCandidate(cart({ updated_at: NOW - (4 * HOUR - 60_000) }), NOW, OPTS)
        expect(r.eligible).toBe(false)
        expect(r.reason).toMatch(/yeni/i)
    })

    it("alt sınır hemen üstü (4s + 1dk) UYGUNDUR", () => {
        expect(isAbandonedCandidate(cart({ updated_at: NOW - (4 * HOUR + 60_000) }), NOW, OPTS).eligible).toBe(true)
    })

    it("çok eski sepet (49s) UYGUN DEĞİL (bayat)", () => {
        const r = isAbandonedCandidate(cart({ updated_at: NOW - 49 * HOUR }), NOW, OPTS)
        expect(r.eligible).toBe(false)
        expect(r.reason).toMatch(/eski|bayat/i)
    })

    it("tamamlanmış (siparişe dönmüş) sepet UYGUN DEĞİL", () => {
        expect(isAbandonedCandidate(cart({ completed_at: new Date(NOW - 5 * HOUR).toISOString() }), NOW, OPTS).eligible).toBe(false)
    })

    it("email yoksa UYGUN DEĞİL", () => {
        expect(isAbandonedCandidate(cart({ email: null }), NOW, OPTS).eligible).toBe(false)
        expect(isAbandonedCandidate(cart({ email: "" }), NOW, OPTS).eligible).toBe(false)
    })

    it("boş sepet (item yok) UYGUN DEĞİL", () => {
        expect(isAbandonedCandidate(cart({ items: [] }), NOW, OPTS).eligible).toBe(false)
        expect(isAbandonedCandidate(cart({ items: null }), NOW, OPTS).eligible).toBe(false)
    })

    it("zaten hatırlatılmış sepet UYGUN DEĞİL (idempotent dedup)", () => {
        const r = isAbandonedCandidate(cart({ metadata: { abandoned_reminder_sent_at: NOW - HOUR } }), NOW, OPTS)
        expect(r.eligible).toBe(false)
        expect(r.reason).toMatch(/hatırlat|zaten/i)
    })

    it("updated_at yoksa UYGUN DEĞİL (yaş hesaplanamaz)", () => {
        expect(isAbandonedCandidate(cart({ updated_at: null }), NOW, OPTS).eligible).toBe(false)
    })

    it("ISO string updated_at kabul edilir", () => {
        expect(isAbandonedCandidate(cart({ updated_at: new Date(NOW - 5 * HOUR).toISOString() }), NOW, OPTS).eligible).toBe(true)
    })
})

describe("buildReturnToCartUrl", () => {
    it("baseUrl + /cart + cart id ile link üretir", () => {
        expect(buildReturnToCartUrl("https://magaza.com", "cart_123")).toBe("https://magaza.com/cart?cart_id=cart_123")
    })
    it("baseUrl sonundaki '/' temizlenir", () => {
        expect(buildReturnToCartUrl("https://magaza.com/", "cart_123")).toBe("https://magaza.com/cart?cart_id=cart_123")
    })
})
