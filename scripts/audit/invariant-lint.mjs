#!/usr/bin/env node
/**
 * AYNA-GENESIS — INVARIANT LINTER (Denetim Katmanı 0)
 * ====================================================
 * Deterministik kod denetçisi. AI YOK, yargı YOK — yalnızca dosyaları okur ve
 * projenin mimari kurallarına aykırı desenleri bulur. Bir programdır; "yaptım"
 * diyerek geçilemez. Her kural, geçmişte GERÇEKTEN yediğimiz bir hatadan türedi.
 *
 * KULLANIM:
 *   node scripts/audit/invariant-lint.mjs            # staged dosyalar (pre-commit)
 *   node scripts/audit/invariant-lint.mjs --all      # tüm kaynak (tam denetim)
 *   node scripts/audit/invariant-lint.mjs --json     # makine-okunur (CI / denetçi ajan)
 *   node scripts/audit/invariant-lint.mjs a.ts b.tsx # belirli dosyalar
 *
 * ÇIKIŞ KODU: herhangi bir ERROR varsa 1 (commit/CI bloklanır), yoksa 0.
 * Satır bazında devre dışı bırakma:  // audit-ignore: <kural-id>
 *
 * @sealed Bu dosya projenin güvenlik temelidir; değiştirmeden önce iki kez düşün.
 */
import { execSync } from "node:child_process"
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { createHash } from "node:crypto"

const ROOT = process.cwd()
const args = process.argv.slice(2)
const JSON_OUT = args.includes("--json")
const SCAN_ALL = args.includes("--all")
const fileArgs = args.filter((a) => !a.startsWith("--"))
// Test modu: kural fixture'larını (scripts/audit/__tests__) doğrudan taramaya izin verir.
// SADECE kural test paketi (audit:test) tarafından kullanılır; üretimde asla set edilmez.
const TEST_MODE = process.env.AUDIT_TEST_MODE === "1"

// ─── Hedef dosyaları belirle ───────────────────────────────────────────────
function listSourceFiles(dir) {
    const out = []
    if (!existsSync(dir)) return out
    for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name === ".medusa" || name === "dist" || name === ".next") continue
        const p = join(dir, name)
        const st = statSync(p)
        if (st.isDirectory()) out.push(...listSourceFiles(p))
        else if (/\.(ts|tsx|mjs|js)$/.test(name)) out.push(p)
    }
    return out
}

function gitStaged() {
    try {
        return execSync("git diff --cached --name-only --diff-filter=ACMR", { encoding: "utf8" })
            .split("\n").map((s) => s.trim()).filter(Boolean).map((f) => join(ROOT, f))
    } catch { return [] }
}

let targets
if (fileArgs.length) targets = fileArgs.map((f) => (f.startsWith(ROOT) ? f : join(ROOT, f)))
else if (SCAN_ALL) targets = [...listSourceFiles(join(ROOT, "src")), ...listSourceFiles(join(ROOT, "storefront", "src"))]
else targets = gitStaged()

// Yalnızca bizim kaynak kodumuz; denetçinin kendisi, testler ve dokümanlar hariç tutulur.
targets = targets.filter((f) => /\.(ts|tsx)$/.test(f))
    .filter((f) => existsSync(f))
    .filter((f) => {
        if (TEST_MODE) return true   // fixture'lar src/ dışında yaşar; testte yol kısıtını gevşet
        const r = relative(ROOT, f).split(sep).join("/")
        return (r.startsWith("src/") || r.startsWith("storefront/src/")) && !r.includes("scripts/audit/")
    })

// ─── Yardımcılar ───────────────────────────────────────────────────────────
const rel = (f) => relative(ROOT, f).split(sep).join("/")
const isTest = (f) => /(__tests__|\.spec\.|\.test\.)/.test(f) || /scripts\/(test-|archive\/)/.test(f)
const has = (path, ...subs) => subs.some((s) => path.includes(s))
// Yorum satırı mı? (Açıklama amaçlı örnekler kuralları tetiklememeli — sızıntı kuralı hariç.)
const isComment = (line) => /^\s*(\/\/|\*|\/\*)/.test(line)

// Bir dosyanın markaya-özel sabit metin taşımasına İZİN verilen yerler (StoreConfig deseni istisnaları).
const BRAND_ALLOWED = (r) => has(r,
    "lib/themes", "store-config", "backfill-store-config", "components/Footer",
    "server/tenant", "components/AgeGate", "sector-framework", "use-ayna-chat", "default-tenant"
)

// ─── KURALLAR ──────────────────────────────────────────────────────────────
// Her kural: { id, severity, scope(rel)->bool, test(line, rel, allLines, idx)->msg|null }
const RULES = [
    {
        id: "leaked-secret",
        severity: "error",
        scope: (r) => !isTest(r),
        test: (line) => {
            if (/ghp_[A-Za-z0-9]{20,}/.test(line)) return "GitHub PAT (ghp_...) kaynak kodda — sızıntı"
            if (/AKIA[0-9A-Z]{16}/.test(line)) return "AWS erişim anahtarı kaynak kodda"
            if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(line)) return "Özel anahtar (private key) kaynak kodda"
            return null
        },
    },
    {
        id: "hardcoded-password",
        severity: "error",
        skipComments: true,
        scope: (r) => !isTest(r),
        test: (line) => {
            // admin_password / password alanına SABİT string literal atanması (env/rastgele değil).
            if (/\b(admin_password|password)\s*[:=]\s*["'][^"']{3,}["']/.test(line) &&
                !/process\.env|randomBytes|generate|req\.|args\.|input\.|body\./.test(line)) {
                return "Sabit (hardcoded) parola — env veya kriptografik rastgele kullanılmalı"
            }
            if (/["'](Password123|admin123|123456|changeme|password123)["'!]/i.test(line)) {
                return "Tahmin edilebilir zayıf parola sabiti"
            }
            return null
        },
    },
    {
        id: "fake-seo-rating",
        severity: "error",
        scope: () => true,
        test: (line, r, all, idx) => {
            if (!/Math\.random\(\)/.test(line)) return null
            const around = all.slice(Math.max(0, idx - 5), idx + 6).join("\n")
            if (/aggregateRating|ratingValue|reviewCount|"rating"/.test(around)) {
                return "JSON-LD/SEO puanında Math.random() — SAHTE değerlendirme (dürüstlük ihlali)"
            }
            return null
        },
    },
    {
        id: "migration-default-slug",
        severity: "error",
        skipComments: true,
        scope: (r) => r.includes("/migrations/"),
        test: (line, r, all) => {
            // Dosya coalesce kullanıyorsa çoklu-fallback DOĞRU desendir — flag'leme.
            if (all.some((l) => /coalesce/i.test(l))) return null
            if (/slug\s*['"]?\s*=\s*['"]default['"]/.test(line) || /slug["']\s*=\s*['"]default['"]/.test(line)) {
                return "Migration 'slug=default' varsayıyor — bu kurulumda varsayılan slug 'aqua-havuz'. coalesce(slug, en-eski-tenant) kullan"
            }
            return null
        },
    },
    {
        id: "placeholder-data",
        severity: "warn",
        skipComments: true,
        scope: (r) => !isTest(r),
        test: (line) => {
            if (/TR00\s*0000/.test(line)) return "Placeholder IBAN (TR00 0000...) — gerçek müşteriye gönderilmemeli; config'ten oku"
            if (/admin@example\.com/.test(line) && !/audit-ignore/.test(line)) return "Placeholder e-posta (admin@example.com) — gerçek değer zorunlu olmalı"
            return null
        },
    },
    {
        id: "brand-leak",
        severity: "warn",
        skipComments: true,
        scope: (r) => r.startsWith("storefront/src/") && !BRAND_ALLOWED(r),
        test: (line) => {
            if (/\b(Aqua\s*Havuz|aquahavuz|Havuz Kimyasal|Vozol)\b/.test(line) && !/audit-ignore/.test(line)) {
                return "Mağazaya-özel sabit metin (marka/sektör) — StoreConfig'ten (tenant.settings.storefront) okunmalı"
            }
            return null
        },
    },
    {
        id: "sector-conditional",
        severity: "warn",
        skipComments: true,
        scope: (r) => !has(r, "sector-framework", "lib/themes", "store-config"),
        test: (line) => {
            if (/\bisVape\b/.test(line) || /sector\s*===?\s*["'](vape|pool|retail|horeca|b2b|fashion)["']/.test(line)) {
                if (/audit-ignore/.test(line)) return null
                return "Sektör koşuluyla içerik seçimi (isVape / sector===) — sektör yalnızca preset SEÇMELİ, içerik StoreConfig'ten gelmeli"
            }
            return null
        },
    },
    {
        id: "per-request-pool",
        severity: "warn",
        scope: (r) => !isTest(r),
        test: (line) => {
            if (/(PGVectorStore\.initialize|new\s+Pool\s*\()/.test(line) && !/audit-ignore/.test(line)) {
                return "İstek başına bağlantı havuzu kurulumu olabilir — singleton/modül-düzeyi paylaşım kontrol et (bağlantı tükenmesi riski)"
            }
            return null
        },
    },
    {
        id: "no-as-any",
        severity: "warn",
        scope: (r) => !isTest(r),
        test: (line) => {
            if (/\bas\s+any\b/.test(line) && !/audit-ignore/.test(line)) return "'as any' — tip güvenliğini deler (AGENTS.md). Gerçek tip ya da bilinçliyse // audit-ignore: no-as-any"
            return null
        },
    },
    {
        // Çoklu-tenant SaaS'ın EN BÜYÜK riski: cross-tenant veri sızıntısı. Tenant izolasyonu
        // (PostgreSQL RLS + MikroORM global filter) YALNIZCA tenant modülünün kendisinde yönetilir.
        // Bu bypass desenlerinin başka yerde görünmesi = izolasyonun bilerek/yanlışlıkla delinmesi.
        id: "rls-bypass-forbidden",
        severity: "error",
        skipComments: true,
        scope: (r) => !isTest(r) && !r.includes("modules/tenant/"),
        test: (line) => {
            if (/audit-ignore/.test(line)) return null
            if (/\.disableFilter\s*\(/.test(line)) return "MikroORM filter kapatılıyor (.disableFilter) — tenant izolasyonu delinir. Tenant modülü dışında YASAK"
            if (/(tenantIsolation|TENANT_FILTER_NAME)\s*\]?\s*:\s*false/.test(line)) return "tenantIsolation filtresi 'false' yapılıyor — cross-tenant veri sızıntısı riski"
            if (/['"`]__system__['"`]/.test(line)) return "'__system__' RLS bypass'ı tenant modülü dışında kullanılıyor — tüm tenant'ların verisi açılır (yalnızca tenant modülü/sistem job'larında meşru)"
            if (/app\.current_tenant_id/.test(line)) return "app.current_tenant_id doğrudan set ediliyor — RLS context'i yalnızca tenant-rls subscriber/migration tarafından yönetilmeli"
            return null
        },
    },
    {
        // Çekirdek Medusa entity'lerinin (order/cart/customer/payment) tenant RLS politikası YOKTUR;
        // izolasyon SalesChannel ile sağlanır. Store route'unda sales_channel_id ile sınırlanmayan
        // bir sorgu = cross-tenant veri sızıntısı riski (gerçek hata: order-track/returns email ile).
        id: "store-tenant-scope",
        severity: "error",
        scope: (r) => r.startsWith("src/api/store/") && !isTest(r),
        test: (line, r, all, idx) => {
            const m = /entity:\s*["'](order|cart|customer|payment)["']/.exec(line)
            if (!m) return null
            if (/audit-ignore/.test(line)) return null
            // Bu entity'nin sorgu bloğunu tara: BİR SONRAKİ entity'ye (ya da +50 satır) kadar.
            // Uzun 'fields' listeleri sales_channel_id'yi geç satıra itebilir; sabit pencere yetersiz.
            const limit = Math.min(all.length, idx + 50)
            let end = idx + 1
            for (let i = idx + 1; i < limit; i++) {
                if (/entity:\s*["']/.test(all[i])) break // sonraki sorgu başladı
                end = i + 1
            }
            const window = all.slice(idx, end).join("\n")
            if (/sales_channel_id|audit-ignore:\s*store-tenant-scope/.test(window)) return null
            return `Store sorgusu '${m[1]}' sales_channel_id ile sınırlanmamış — cross-tenant sızıntı riski. Filtreye sales_channel_id ekle; auth-scoped (kendi verisi) ise // audit-ignore: store-tenant-scope <gerekçe>`
        },
    },
    {
        // Supreme Law MADDE 6.1: hafıza (MemoryTruth/Insight/Conscience) DEĞİŞMEZ olay günlüğüdür.
        // Tek meşru sert-silme yolu: arşivleyici cron (src/jobs/ayna-memory-archiver) + onun çağırdığı
        // servis metotları. Bir AI'ın route/tool içine "memory temizle" eklemesi = kalıcı veri kaybı.
        id: "immutable-memory",
        severity: "error",
        skipComments: true,
        scope: (r) => !isTest(r)
            && !r.includes("/migrations/")
            && !r.startsWith("src/jobs/")
            && !r.includes("modules/ayna/service.ts")
            && !r.includes("modules/ayna/services/memory-service.ts"),
        test: (line) => {
            if (/audit-ignore/.test(line)) return null
            if (/\bdelete(MemoryTruths?|MemoryInsights?|MemoryConsciences?)\b/.test(line))
                return "Değişmez hafıza sert-silme çağrısı — yalnızca arşivleyici job'da meşru. Yumuşak işaret için is_archived:true kullan"
            if (/DELETE\s+FROM\s+["'`]?memory_(truth|insight|conscience)/i.test(line))
                return "memory_* tablosunda doğrudan DELETE — değişmez hafıza ihlali (Supreme Law 6.1)"
            if (/memory_(truth|insight|conscience)/i.test(line) && /\.(remove|destroy|delete)\s*\(/.test(line))
                return "memory_* üzerinde remove/destroy/delete — değişmez hafıza ihlali (is_archived kullan)"
            return null
        },
    },
]

// ─── MÜHÜR DENETİMİ (sealed-file-guard) ────────────────────────────────────
// @sealed başlıklı dosyalar mimarinin kritik temelidir (08_ARCHITECTURE_SEAL.md).
// İçerik hash'i scripts/audit/sealed.manifest.json'da saklanır. Bir mühürlü dosya
// değişirse hash tutmaz → commit BLOKLANIR. Bilinçli değişiklik için `npm run audit:seal`
// çalıştırılır (mührü yeniler). Bu, AI'ın kritik dosyayı sessizce değiştirmesini engeller.
// Per-satır metin işaretinin aksine kalıcı bir "ignore" ile kandırılamaz.
const SEAL_MARKER = /@sealed/
const MANIFEST_PATH = join(ROOT, "scripts", "audit", "sealed.manifest.json")
// Platformlar arası tutarlılık: satır sonlarını normalize ederek hash'le (CRLF/LF farkı hash'i bozmasın).
function sealHash(content) {
    return createHash("sha256").update(content.replace(/\r\n/g, "\n"), "utf8").digest("hex")
}
function loadManifest() {
    try { return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) } catch { return {} }
}
// Tam tarama (--all) hariç — mühür denetimi yalnızca commit/diff bağlamında anlamlıdır.
function checkSeals(files, sink) {
    if (SCAN_ALL) return
    const manifest = loadManifest()
    for (const file of files) {
        let content
        try { content = readFileSync(file, "utf8") } catch { continue }
        if (!SEAL_MARKER.test(content)) continue
        const r = rel(file)
        const current = sealHash(content)
        const sealed = manifest[r]
        if (!sealed) {
            sink.push({ file: r, line: 1, rule: "sealed-file-guard", severity: "error",
                message: "Yeni MÜHÜRLÜ dosya (@sealed) manifest'te yok — `npm run audit:seal` çalıştır ve manifest'i commit'e ekle" })
        } else if (sealed !== current) {
            sink.push({ file: r, line: 1, rule: "sealed-file-guard", severity: "error",
                message: "MÜHÜR KIRILDI — mühürlü dosya değişti. Bilinçliyse `npm run audit:seal` çalıştır + docs/GENESIS_PROTOCOL/08_ARCHITECTURE_SEAL.md'yi güncelle" })
        }
    }
}

// ─── Tarama ────────────────────────────────────────────────────────────────
const findings = []
for (const file of targets) {
    const r = rel(file)
    let lines
    try { lines = readFileSync(file, "utf8").split(/\r?\n/) } catch { continue }
    for (const rule of RULES) {
        if (rule.scope && !rule.scope(r)) continue
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            // Satır bazında devre dışı bırakma
            if (new RegExp(`audit-ignore:\\s*${rule.id}`).test(line)) continue
            // Açıklama amaçlı yorum satırlarını atla (sızıntı kuralı hariç — yorumdaki secret de sızıntıdır).
            if (rule.skipComments && isComment(line)) continue
            const msg = rule.test(line, r, lines, i)
            if (msg) findings.push({ file: r, line: i + 1, rule: rule.id, severity: rule.severity, message: msg })
        }
    }
}

// Mühür denetimi (hash tabanlı) — satır kurallarından bağımsız, dosya bütünü üzerinde.
checkSeals(targets, findings)

const errors = findings.filter((f) => f.severity === "error")
const warns = findings.filter((f) => f.severity === "warn")

// ─── Çıktı ─────────────────────────────────────────────────────────────────
if (JSON_OUT) {
    console.log(JSON.stringify({ scanned: targets.length, errors: errors.length, warnings: warns.length, findings }, null, 2))
    process.exit(errors.length ? 1 : 0)
}

const C = { red: "\x1b[31m", yel: "\x1b[33m", grn: "\x1b[32m", dim: "\x1b[2m", b: "\x1b[1m", x: "\x1b[0m" }
console.log(`${C.b}── AYNA Invariant Linter ──${C.x} ${targets.length} dosya tarandı`)
if (!findings.length) {
    console.log(`${C.grn}✓ Temiz — mimari kural ihlali yok.${C.x}`)
    process.exit(0)
}
for (const f of [...errors, ...warns]) {
    const tag = f.severity === "error" ? `${C.red}HATA ${C.x}` : `${C.yel}UYARI${C.x}`
    console.log(`${tag} ${C.dim}${f.file}:${f.line}${C.x}  [${f.rule}]  ${f.message}`)
}
console.log(`\n${errors.length ? C.red : C.grn}${errors.length} HATA${C.x}  ${C.yel}${warns.length} uyarı${C.x}`)
if (errors.length) {
    console.log(`${C.red}${C.b}✗ Commit/CI bloklandı. HATA'lar düzeltilmeli (ya da bilinçliyse // audit-ignore: <kural>).${C.x}`)
    process.exit(1)
}
console.log(`${C.grn}✓ Bloklayan hata yok (uyarılar bilgilendirme).${C.x}`)
process.exit(0)
