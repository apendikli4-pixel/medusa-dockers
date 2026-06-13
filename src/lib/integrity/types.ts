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
    /**
     * Bu kontrolün onarıcısı OTOMATİK (insan onayı olmadan) çalıştırılmaya uygun mu?
     * Yalnızca idempotent ve YIKICI OLMAYAN onarımlar (config/ayar yeniden uygulama) true olmalı.
     * Veri silen/taşıyan onarımlar ASLA güvenli sayılmaz — onlar insan onayı bekler.
     */
    safeToAutoHeal?: boolean
    run: (ctx: CheckContext) => Promise<CheckResult>
    /**
     * Opsiyonel onarıcı. Çalıştıktan sonra çağıran `run`'ı YENİDEN koşturur ve onarımın
     * gerçekten işe yaradığını kanıtlar; yalnızca yeniden-kontrol OK dönerse "çözüldü" sayılır.
     */
    heal?: (ctx: CheckContext) => Promise<{ changed: boolean; detail: string }>
}

/** Tek bir onarım girişiminin DÜRÜST sonucu. */
export interface HealResult {
    id: string
    attempted: boolean
    /** Onarıcı gerçekten bir değişiklik uyguladı mı. */
    changed: boolean
    /** Onarımdan SONRA kontrol yeniden çalıştırıldı ve GEÇTİ mi (kanıtlanmış çözüm). */
    resolved: boolean
    detail: string
}

export interface SelfHealReport {
    healedAt: string
    attempts: HealResult[]
    /** Onarılıp YENİDEN-KONTROLLE doğrulananların id'leri (gerçek düzeltmeler — sahte değil). */
    fixed: string[]
    /** Denenip çözülemeyenler (dürüstçe raporlanır, gizlenmez). */
    unresolved: string[]
}
