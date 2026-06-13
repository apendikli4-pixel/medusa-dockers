/**
 * CANLI BÜTÜNLÜK DENETÇİSİ — Kontroller
 * ═════════════════════════════════════
 * Her kontrol CANLI sistemin gerçek bir mimari değişmezini doğrular. Hepsi savunmacıdır:
 * doğrulayamadığında "OK" demez (sahte-yeşil yasak) — gerçek bir sorun bulursa FAIL/WARN,
 * ortam eksikse SKIPPED döner. Çağıran (run.ts) ayrıca istisnaları FAIL'e çevirir.
 *
 * Kontroller projenin GERÇEK geçmiş hatalarından ve mimari sütunlarından türemiştir:
 *  - search-isolation: Meili 'products' indeksinde sales_channel_ids filtrelenebilir olmalı
 *    (geçmişte eksikti → arama tüm tenant'ların ürünlerini sızdırıyordu).
 *  - tenants-present / regions / shipping: vitrinin ayakta olması için zorunlu temel veri.
 *  - ai-provider: Ollama tek motor (Gemini kaldırıldı) — yoksa Ayna sohbeti çöker.
 */
import type { Check, CheckResult } from "./types"

const r = (id: string, title: string, status: CheckResult["status"], detail: string, evidence?: Record<string, unknown>): CheckResult =>
    ({ id, title, status, detail, evidence })

/** Veritabanı erişilebilir mi — en temel canlılık. */
const databaseCheck: Check = {
    id: "database",
    title: "Veritabanı erişilebilir",
    async run({ query }) {
        if (!query) return r(this.id, this.title, "SKIPPED", "query servisi yok — kontrol atlandı.")
        const { data } = await query.graph({ entity: "region", fields: ["id"], pagination: { take: 1 } })
        return r(this.id, this.title, "OK", "Veritabanı sorguya yanıt verdi.", { reachable: Array.isArray(data) })
    },
}

/** Çok-mağaza platformu en az bir tenant içermeli. */
const tenantsPresentCheck: Check = {
    id: "tenants-present",
    title: "En az bir mağaza (tenant) tanımlı",
    async run({ query }) {
        if (!query) return r(this.id, this.title, "SKIPPED", "query servisi yok.")
        try {
            const { data } = await query.graph({ entity: "tenant", fields: ["id"], pagination: { take: 5 } })
            const n = (data ?? []).length
            return n > 0
                ? r(this.id, this.title, "OK", `${n}${n >= 5 ? "+" : ""} tenant mevcut.`, { count: n })
                : r(this.id, this.title, "WARN", "Hiç tenant yok — çok-mağaza platformu boş, vitrinler tenant çözemez.")
        } catch (e) {
            return r(this.id, this.title, "SKIPPED", `tenant entity sorgulanamadı: ${msg(e)}`)
        }
    },
}

/** Arama indeksi tenant-izolasyonlu mu (gerçek geçmiş sızıntı hatası). */
const searchIsolationCheck: Check = {
    id: "search-isolation",
    title: "Arama indeksi tenant-izolasyonlu (sales_channel_ids filtrelenebilir)",
    async run({ env }) {
        const host = env.MEILISEARCH_HOST
        const apiKey = env.MEILISEARCH_MASTER_KEY
        if (!host || !apiKey) {
            return r(this.id, this.title, "SKIPPED", "Meilisearch env (HOST/MASTER_KEY) tanımlı değil — kontrol atlandı.")
        }
        try {
            const { MeiliSearch } = await import("meilisearch")
            const client = new MeiliSearch({ host, apiKey })
            const filterable = await client.index("products").getFilterableAttributes()
            const isolated = Array.isArray(filterable) && filterable.includes("sales_channel_ids")
            return isolated
                ? r(this.id, this.title, "OK", "'products' indeksinde sales_channel_ids filtrelenebilir — arama tenant izolasyonu aktif.", { filterable })
                : r(this.id, this.title, "FAIL", "'products' indeksinde sales_channel_ids FİLTRELENEBİLİR DEĞİL — arama tüm tenant ürünlerini sızdırabilir! Çözüm: setup-meilisearch script'ini çalıştır.", { filterable })
        } catch (e) {
            return r(this.id, this.title, "FAIL", `Meilisearch erişilemedi: ${msg(e)}`)
        }
    },
}

/** Bölge (region) yapılandırılmış mı — checkout için zorunlu. */
const regionsCheck: Check = {
    id: "regions-configured",
    title: "En az bir bölge (region) tanımlı",
    async run({ query }) {
        if (!query) return r(this.id, this.title, "SKIPPED", "query servisi yok.")
        const { data } = await query.graph({ entity: "region", fields: ["id"], pagination: { take: 1 } })
        return (data ?? []).length > 0
            ? r(this.id, this.title, "OK", "Bölge yapılandırması mevcut.")
            : r(this.id, this.title, "FAIL", "Hiç bölge (region) yok — checkout çalışmaz.")
    },
}

/** Kargo seçeneği var mı — sipariş tamamlanabilmesi için. */
const shippingCheck: Check = {
    id: "shipping-configured",
    title: "En az bir kargo seçeneği tanımlı",
    async run({ query }) {
        if (!query) return r(this.id, this.title, "SKIPPED", "query servisi yok.")
        const { data } = await query.graph({ entity: "shipping_option", fields: ["id"], pagination: { take: 1 } })
        return (data ?? []).length > 0
            ? r(this.id, this.title, "OK", "Kargo seçeneği mevcut.")
            : r(this.id, this.title, "WARN", "Hiç kargo seçeneği yok — müşteri siparişi tamamlayamayabilir.")
    },
}

/** AI motoru (Ollama) yapılandırılmış mı — Ayna sohbeti buna bağlı. */
const aiProviderCheck: Check = {
    id: "ai-provider",
    title: "AI motoru (Ollama) yapılandırılmış",
    async run({ env }) {
        const url = env.OLLAMA_API_URL
        return url
            ? r(this.id, this.title, "OK", `Ollama yapılandırılmış (${url}).`)
            : r(this.id, this.title, "WARN", "OLLAMA_API_URL tanımlı değil — Ayna AI sohbeti devre dışı olabilir (Gemini kaldırıldı, tek motor Ollama).")
    },
}

function msg(e: unknown): string {
    return e instanceof Error ? e.message : String(e)
}

/** Varsayılan kontrol seti — heartbeat ve admin endpoint bunu kullanır. */
export const DEFAULT_CHECKS: Check[] = [
    databaseCheck,
    tenantsPresentCheck,
    searchIsolationCheck,
    regionsCheck,
    shippingCheck,
    aiProviderCheck,
]
