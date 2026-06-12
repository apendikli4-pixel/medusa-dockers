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

const ROOT = process.cwd()
const args = process.argv.slice(2)
const JSON_OUT = args.includes("--json")
const SCAN_ALL = args.includes("--all")
const fileArgs = args.filter((a) => !a.startsWith("--"))

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
]

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
