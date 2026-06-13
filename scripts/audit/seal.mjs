#!/usr/bin/env node
/**
 * AYNA-GENESIS — MÜHÜR YENİLEYİCİ (sealed.manifest.json üreticisi)
 * ================================================================
 * src/ ve storefront/src/ içinde `@sealed` başlığı taşıyan TÜM dosyaları bulur,
 * içerik hash'lerini hesaplar ve scripts/audit/sealed.manifest.json'a yazar.
 *
 * NE ZAMAN ÇALIŞTIRILIR:
 *   - Yeni bir dosyaya @sealed başlığı eklediğinde.
 *   - Mühürlü bir dosyada BİLİNÇLİ bir değişiklik yaptığında (mührü yenilemek için).
 *
 * KULLANIM:  npm run audit:seal   (veya: node scripts/audit/seal.mjs)
 *
 * Mühür mantığı invariant-lint.mjs'deki checkSeals ile BİREBİR aynı olmalıdır:
 * satır sonları normalize edilerek (CRLF→LF) sha256 alınır.
 *
 * @sealed
 */
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { createHash } from "node:crypto"

const ROOT = process.cwd()
const MANIFEST_PATH = join(ROOT, "scripts", "audit", "sealed.manifest.json")
const SEAL_MARKER = /@sealed/

const rel = (f) => relative(ROOT, f).split(sep).join("/")
function sealHash(content) {
    return createHash("sha256").update(content.replace(/\r\n/g, "\n"), "utf8").digest("hex")
}

function listSourceFiles(dir) {
    const out = []
    if (!existsSync(dir)) return out
    for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name === ".medusa" || name === "dist" || name === ".next") continue
        const p = join(dir, name)
        const st = statSync(p)
        if (st.isDirectory()) out.push(...listSourceFiles(p))
        else if (/\.(ts|tsx)$/.test(name)) out.push(p)
    }
    return out
}

const files = [...listSourceFiles(join(ROOT, "src")), ...listSourceFiles(join(ROOT, "storefront", "src"))]
const manifest = {}
for (const f of files) {
    let content
    try { content = readFileSync(f, "utf8") } catch { continue }
    if (!SEAL_MARKER.test(content)) continue
    manifest[rel(f)] = sealHash(content)
}

// Deterministik çıktı (alfabetik) — diff gürültüsünü ve sahte değişiklikleri önler.
const sorted = {}
for (const k of Object.keys(manifest).sort()) sorted[k] = manifest[k]
writeFileSync(MANIFEST_PATH, JSON.stringify(sorted, null, 2) + "\n", "utf8")

const n = Object.keys(sorted).length
console.log(`✓ Mühür güncellendi: ${n} mühürlü dosya → scripts/audit/sealed.manifest.json`)
for (const k of Object.keys(sorted)) console.log(`  · ${k}`)
