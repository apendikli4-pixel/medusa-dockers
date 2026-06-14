#!/usr/bin/env node
/**
 * AYNA-GENESIS — UÇTAN UCA DUMAN TESTİ (Smoke Test)
 * ==================================================
 * CANLI deploy edilmiş sistemin gerçekten çalışıp çalışmadığını dışarıdan, müşteri gibi
 * HTTP istekleriyle kanıtlar. Mock yok — gerçek sistem. Salt-okunur (sipariş/ödeme YARATMAZ).
 *
 * Bu, derleme-zamanı geçidi (audit) ve çalışma-zamanı kalp atışı (integrity) üçlüsünün
 * üçüncü ayağıdır: "dağıtılan ürün, son kullanıcı için gerçekten ayakta mı?"
 *
 * KULLANIM:
 *   node scripts/smoke-test.mjs                 # .env / varsayılan canlı adresler
 *   node scripts/smoke-test.mjs --json          # makine-okunur
 *   BACKEND_URL=https://... PUBLISHABLE_API_KEY=pk_... node scripts/smoke-test.mjs
 *
 * ÇIKIŞ KODU: herhangi bir FAIL varsa 1, yoksa 0.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

// ─── Konfigürasyon (env > .env > varsayılan) ──────────────────────────────
function loadDotenv() {
    try {
        const txt = readFileSync(join(process.cwd(), ".env"), "utf8")
        const out = {}
        for (const line of txt.split(/\r?\n/)) {
            const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
            if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "")
        }
        return out
    } catch { return {} }
}
const dotenv = loadDotenv()
const cfg = (k, fallback) => process.env[k] || dotenv[k] || fallback

const BACKEND = cfg("BACKEND_URL", "https://api.141.98.48.155.sslip.io").replace(/\/$/, "")
const PK = cfg("PUBLISHABLE_API_KEY", "")
const STOREFRONTS = cfg("SMOKE_STOREFRONTS", "https://ayna.141.98.48.155.sslip.io,https://vozol.141.98.48.155.sslip.io")
    .split(",").map((s) => s.trim()).filter(Boolean)
const JSON_OUT = process.argv.includes("--json")
const TIMEOUT_MS = Number(cfg("SMOKE_TIMEOUT_MS", "20000"))

// ─── Yardımcılar ──────────────────────────────────────────────────────────
async function http(url, opts = {}) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    const started = Date.now()
    try {
        const res = await fetch(url, { ...opts, signal: ctrl.signal })
        const text = await res.text()
        return { ok: true, status: res.status, ms: Date.now() - started, text }
    } catch (e) {
        return { ok: false, status: 0, ms: Date.now() - started, error: e instanceof Error ? e.message : String(e) }
    } finally { clearTimeout(t) }
}
function tryJson(text) { try { return JSON.parse(text) } catch { return null } }
function titleOf(html) { const m = (html || "").match(/<title[^>]*>([^<]*)<\/title>/i); return m ? m[1].trim().slice(0, 80) : null }

// ─── Kontroller ───────────────────────────────────────────────────────────
const results = []
const add = (name, status, detail, evidence) => results.push({ name, status, detail, evidence })

async function run() {
    // 0) Erişilebilirlik — sunucu hiç yanıt veriyor mu (örn. fatura/kapalı durumu burada yakalanır)
    const ping = await http(`${BACKEND}/health`)
    if (!ping.ok || ping.status === 0) {
        add("backend-reachable", "FAIL", `Backend'e ulaşılamıyor (${ping.error || "yanıt yok"}). Sunucu kapalı/erişilemez olabilir.`)
        return // gerisi anlamsız
    }

    // 1) Canlılık
    const health = tryJson(ping.text)
    add("backend-health", health?.status === "ok" ? "PASS" : "WARN",
        health?.status === "ok" ? `/health OK (uptime ${health.uptime_seconds ?? "?"}s, ${ping.ms}ms)` : `/health beklenen 'ok' değil (HTTP ${ping.status})`,
        { status: ping.status })

    // 2) Store API — ürünler (publishable key zorunlu)
    if (!PK) {
        add("store-products", "SKIP", "PUBLISHABLE_API_KEY yok — store API kontrolü atlandı.")
    } else {
        const r = await http(`${BACKEND}/store/products?limit=3&fields=id,title,handle`, { headers: { "x-publishable-api-key": PK } })
        const j = tryJson(r.text)
        const count = j?.count ?? (Array.isArray(j?.products) ? j.products.length : null)
        add("store-products", r.status === 200 && (j?.products?.length > 0) ? "PASS" : (r.status === 200 ? "WARN" : "FAIL"),
            r.status === 200 ? (j?.products?.length > 0 ? `${count ?? j.products.length} ürün döndü (örn: "${j.products[0]?.title ?? "?"}")` : "200 ama ürün yok — katalog boş olabilir") : `HTTP ${r.status}`,
            { httpStatus: r.status })

        // 3) Store API — bölgeler (checkout için zorunlu)
        const rg = await http(`${BACKEND}/store/regions?fields=id,name,currency_code`, { headers: { "x-publishable-api-key": PK } })
        const jg = tryJson(rg.text)
        const regions = jg?.regions?.length ?? 0
        add("store-regions", rg.status === 200 && regions > 0 ? "PASS" : (rg.status === 200 ? "WARN" : "FAIL"),
            rg.status === 200 ? (regions > 0 ? `${regions} bölge (para birimi: ${jg.regions[0]?.currency_code ?? "?"})` : "200 ama bölge yok — checkout çalışmaz") : `HTTP ${rg.status}`)
    }

    // 4) Storefront'lar ayakta mı + tenant izolasyonu (farklı marka/başlık)
    const titles = {}
    for (const sf of STOREFRONTS) {
        const r = await http(`${sf}/`)
        const title = titleOf(r.text)
        const host = sf.replace(/^https?:\/\//, "").split(".")[0]
        titles[host] = title
        add(`storefront-${host}`, r.status === 200 ? "PASS" : "FAIL",
            r.status === 200 ? `200 — başlık: "${title ?? "(başlık yok)"}" (${r.ms}ms)` : `HTTP ${r.status} (${r.error ?? ""})`)
    }
    // Çok-tenant kanıtı: en az iki storefront farklı içerik (başlık) döndürmeli
    const hosts = Object.keys(titles)
    if (hosts.length >= 2) {
        const uniq = new Set(Object.values(titles).filter(Boolean))
        add("tenant-isolation", uniq.size >= 2 ? "PASS" : "WARN",
            uniq.size >= 2 ? `Farklı tenant'lar farklı içerik döndürüyor: ${JSON.stringify(titles)}` : `Storefront başlıkları ayrışmıyor — izolasyon şüpheli: ${JSON.stringify(titles)}`)
    }

    // 5) Arama uçtan uca (storefront proxy /api/search)
    if (STOREFRONTS[0]) {
        const r = await http(`${STOREFRONTS[0]}/api/search?q=a`)
        add("search", r.status === 200 ? "PASS" : (r.status === 404 ? "SKIP" : "WARN"),
            r.status === 200 ? "Arama uç noktası yanıt verdi (200)" : `Arama HTTP ${r.status}`)
    }
}

// ─── Çalıştır + raporla ───────────────────────────────────────────────────
await run()

const fails = results.filter((r) => r.status === "FAIL").length
const warns = results.filter((r) => r.status === "WARN").length
const passes = results.filter((r) => r.status === "PASS").length

if (JSON_OUT) {
    console.log(JSON.stringify({ backend: BACKEND, storefronts: STOREFRONTS, passes, warns, fails, results }, null, 2))
    process.exit(fails ? 1 : 0)
}

const C = { red: "\x1b[31m", yel: "\x1b[33m", grn: "\x1b[32m", dim: "\x1b[2m", b: "\x1b[1m", x: "\x1b[0m" }
const tag = (s) => s === "PASS" ? `${C.grn}PASS${C.x}` : s === "FAIL" ? `${C.red}FAIL${C.x}` : s === "WARN" ? `${C.yel}WARN${C.x}` : `${C.dim}SKIP${C.x}`
console.log(`${C.b}── AYNA Uçtan Uca Duman Testi ──${C.x}  ${C.dim}${BACKEND}${C.x}`)
for (const r of results) console.log(`  ${tag(r.status)}  ${C.b}${r.name}${C.x} — ${r.detail}`)
console.log(`\n${fails ? C.red : C.grn}${passes} PASS${C.x}  ${C.yel}${warns} uyarı${C.x}  ${fails ? C.red : ""}${fails} BAŞARISIZ${C.x}`)
if (fails) console.log(`${C.red}${C.b}✗ Sistem uçtan uca DOĞRULANAMADI.${C.x}`)
else console.log(`${C.grn}✓ Canlı sistem uçtan uca yanıt veriyor.${C.x}`)
process.exit(fails ? 1 : 0)
