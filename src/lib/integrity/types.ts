/**
 * CANLI BÜTÜNLÜK DENETÇİSİ — Tipler
 * ══════════════════════════════════
 * Bu, derleme-zamanı invariant linter'ının (scripts/audit) ÇALIŞMA-ZAMANI ikizidir.
 * Linter kodu commit'te denetler; bu katman CANLI sistemin değişmezlerini sürekli denetler.
 *
 * İLKE (Madde 3 — dürüstlük): Bir kontrol bir şeyi DOĞRULAYAMIYORSA "OK" demez; "SKIPPED"
 * der. Sahte-yeşil yoktur. Her sonuç gerçeği yansıtır.
 */

export type CheckStatus = "OK" | "WARN" | "FAIL" | "SKIPPED"

export interface CheckResult {
    id: string
    title: string
    status: CheckStatus
    /** Türkçe, insanın okuyabileceği açıklama (neden bu statü). */
    detail: string
    /** Karara dayanak veri (sayım, liste vb.) — şeffaflık için. */
    evidence?: Record<string, unknown>
}

export interface IntegrityVerdict {
    overall: CheckStatus
    checkedAt: string
    summary: string
    counts: { ok: number; warn: number; fail: number; skipped: number }
    checks: CheckResult[]
}

/** Kontrollerin çalışma-zamanı bağlamı (servisler runtime'da enjekte edilir). */
export interface CheckContext {
    /** Medusa remoteQuery — .graph({ entity, fields, ... }) */
    query: { graph: (cfg: Record<string, unknown>) => Promise<{ data: unknown[] }> } | null
    /** Medusa container (gerekirse ek servis çözmek için). */
    container?: { resolve: (key: string) => unknown }
    logger?: { info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void }
    env: Record<string, string | undefined>
    /** Sabit zaman damgası (test determinizmi için opsiyonel). */
    now?: string
}

export interface Check {
    id: string
    title: string
    run: (ctx: CheckContext) => Promise<CheckResult>
}
