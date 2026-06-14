/**
 * Terk Edilmiş Sepet — Saf Çekirdek (DB'siz, deterministik, tam test edilir)
 * ═════════════════════════════════════════════════════════════════════════
 * "Bu sepet bir hatırlatma e-postası için uygun mu?" kararını yan etkisiz verir.
 * Job (src/jobs/abandoned-cart-recovery.ts) bu çekirdeği çağıran ince orkestratördür.
 */

export interface AbandonedCartInput {
    id: string
    email?: string | null
    /** Doluysa sepet siparişe dönüşmüş demektir — aday DEĞİL. */
    completed_at?: string | number | Date | null
    updated_at?: string | number | Date | null
    items?: Array<unknown> | null
    /** abandoned_reminder_sent_at burada tutulur (idempotent dedup). */
    metadata?: Record<string, unknown> | null
}

export interface CandidateOpts {
    /** Bu kadar süre geçmeden hatırlatma yapılmaz (örn. 4 saat). */
    minAgeMs: number
    /** Bu kadar süreden eski sepetler "bayat" sayılır, hatırlatılmaz (örn. 48 saat). */
    maxAgeMs: number
}

export interface CandidateResult {
    eligible: boolean
    reason: string
}

function toMs(v: string | number | Date | null | undefined): number | null {
    if (v == null) return null
    if (v instanceof Date) return v.getTime()
    const t = new Date(v).getTime()
    return Number.isNaN(t) ? null : t
}

/**
 * Sepetin hatırlatma e-postası için uygun olup olmadığını döndürür.
 * @param now Şimdiki zaman (ms epoch) — test determinizmi için dışarıdan verilir.
 */
export function isAbandonedCandidate(
    cart: AbandonedCartInput,
    now: number,
    opts: CandidateOpts
): CandidateResult {
    if (cart.completed_at != null) return { eligible: false, reason: "zaten siparişe dönüşmüş" }
    if (!cart.email || !cart.email.trim()) return { eligible: false, reason: "email yok" }
    if (!cart.items || cart.items.length === 0) return { eligible: false, reason: "boş sepet" }
    if (cart.metadata?.abandoned_reminder_sent_at != null) {
        return { eligible: false, reason: "zaten hatırlatıldı (dedup)" }
    }

    const updatedMs = toMs(cart.updated_at)
    if (updatedMs == null) return { eligible: false, reason: "zaman bilgisi yok" }

    const age = now - updatedMs
    if (age < opts.minAgeMs) return { eligible: false, reason: "henüz çok yeni" }
    if (age > opts.maxAgeMs) return { eligible: false, reason: "çok eski (bayat)" }

    return { eligible: true, reason: "uygun" }
}

/** Müşteriyi sepetine geri götüren link. Storefront /cart?cart_id=... ile sepeti geri yükler. */
export function buildReturnToCartUrl(baseUrl: string, cartId: string): string {
    return `${baseUrl.replace(/\/+$/, "")}/cart?cart_id=${encodeURIComponent(cartId)}`
}
