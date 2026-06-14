import { MedusaContainer } from "@medusajs/framework/types"
import { spawn } from "node:child_process"
import { createGzip } from "node:zlib"
import { createWriteStream, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs"
import { join } from "node:path"

/**
 * Otomatik Veritabanı Yedeği — Zamanlanmış Görev
 * ═══════════════════════════════════════════════
 * Her gün pg_dump ile gzip'li, zaman damgalı bir yedek alır; eski yedekleri (retention) temizler;
 * opsiyonel off-site yükleme kancası çalıştırır. Tamamen savunmacı: pg_dump yok/DATABASE_URL yoksa
 * çökmez, dürüstçe uyarır. (Runner imajında postgresql-client → pg_dump mevcuttur.)
 *
 * ⚠️ Sunucu-içi yedek, sunucu/volume ölürse onunla ölür. GERÇEK güvenlik için BACKUP_UPLOAD_CMD ile
 *    off-site (S3/B2/rclone) yükleme ZORUNLUDUR. Ve "test edilmemiş yedek = yedek değildir":
 *    geri-yükleme prosedürü düzenli test edilmeli (bkz. docs/RUNBOOK-YEDEKLEME.md).
 */
export default async function dbBackupJob(container: MedusaContainer): Promise<void> {
    const logger = container.resolve("logger") as { info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void }

    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) { logger.warn("[Backup] DATABASE_URL yok — yedek atlandı."); return }

    const dir = process.env.BACKUP_DIR || "/server/backups"
    const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS) || 14
    try { mkdirSync(dir, { recursive: true }) } catch (e) {
        logger.error(`[Backup] Yedek dizini oluşturulamadı (${dir}): ${e instanceof Error ? e.message : e}`); return
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-")
    const file = join(dir, `genesis-${stamp}.sql.gz`)

    // ─── pg_dump | gzip > file ───
    try {
        await new Promise<void>((resolve, reject) => {
            const dump = spawn("pg_dump", ["--no-owner", "--no-privileges", "--format=plain", dbUrl], { stdio: ["ignore", "pipe", "pipe"] })
            const out = createWriteStream(file)
            let stderr = ""
            dump.stderr.on("data", (d) => { stderr += d.toString() })
            dump.on("error", reject) // pg_dump bulunamadı vb.
            out.on("error", reject)
            out.on("finish", () => resolve())
            dump.on("close", (code) => { if (code !== 0) reject(new Error(`pg_dump çıkış ${code}: ${stderr.slice(0, 300)}`)) })
            dump.stdout.pipe(createGzip({ level: 9 })).pipe(out)
        })
    } catch (e) {
        logger.error(`[Backup] Yedek BAŞARISIZ: ${e instanceof Error ? e.message : e}`)
        try { unlinkSync(file) } catch { /* yarım dosya yoksa sorun değil */ }
        return
    }

    const sizeMb = (statSync(file).size / 1024 / 1024).toFixed(1)
    logger.info(`[Backup] ✓ Yedek alındı: ${file} (${sizeMb} MB)`)

    // ─── Retention: eski yedekleri sil ───
    const cutoff = Date.now() - retentionDays * 86_400_000
    let removed = 0
    try {
        for (const f of readdirSync(dir)) {
            if (!f.endsWith(".sql.gz")) continue
            const p = join(dir, f)
            if (statSync(p).mtimeMs < cutoff) { unlinkSync(p); removed++ }
        }
    } catch (e) { logger.warn(`[Backup] Retention temizliği kısmen başarısız: ${e instanceof Error ? e.message : e}`) }
    if (removed) logger.info(`[Backup] ${removed} eski yedek temizlendi (>${retentionDays} gün).`)

    // ─── Off-site yükleme (opsiyonel ama GERÇEK güvenlik için zorunlu) ───
    const uploadCmd = process.env.BACKUP_UPLOAD_CMD
    if (!uploadCmd) {
        logger.warn("[Backup] ⚠️ BACKUP_UPLOAD_CMD tanımlı değil — yedek YALNIZCA sunucuda. Off-site yükleme ZORUNLU (veri kaybı riski).")
        return
    }
    try {
        await new Promise<void>((resolve, reject) => {
            // Dosya yolu argv'ye değil env'e ($BACKUP_FILE) verilir — enjeksiyon güvenli.
            const up = spawn("sh", ["-c", uploadCmd], { env: { ...process.env, BACKUP_FILE: file }, stdio: ["ignore", "ignore", "pipe"] })
            let err = ""
            up.stderr.on("data", (d) => { err += d.toString() })
            up.on("error", reject)
            up.on("close", (code) => code === 0 ? resolve() : reject(new Error(`upload çıkış ${code}: ${err.slice(0, 300)}`)))
        })
        logger.info("[Backup] ✓ Off-site yükleme tamam.")
    } catch (e) {
        logger.error(`[Backup] Off-site yükleme BAŞARISIZ: ${e instanceof Error ? e.message : e}`)
    }
}

export const config = {
    name: "db-backup",
    schedule: "0 3 * * *", // her gün 03:00
}
