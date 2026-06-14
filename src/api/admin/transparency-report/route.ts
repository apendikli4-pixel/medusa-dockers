import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { getCircuitBreaker } from "../../../lib/circuit-breaker"
import { summarizeConscience, countAction } from "./metrics"

/**
 * [GET] /admin/transparency-report
 *
 * DÜRÜSTLÜK & ŞEFFAFLIK RAPORU — yalnızca GERÇEK veriden.
 *
 * Mirror Core'daki "şeffaflık raporu" sabit uydurma sayılar basıyordu (%98 vb.).
 * Bu, dürüstlük markasının tam zıttıdır. Bu sürüm UYDURMA SAYI İÇERMEZ — her metrik
 * canlı veritabanı/çalışma-anı kaynaklarından okunur; kaynak boşsa 0 döner (gizlemez).
 *
 * Kaynaklar (hepsi gerçek):
 *  - memory_truth:   TEK DOĞRULUK KAYNAĞI. AI'ın gerçek eylemleri + etik verdict'leri
 *                    (metadata.action="conscience_deny"/"conscience_allow"); ayrıca
 *                    "product_search" => yanıtın gerçek ürün verisine BAĞLANDIĞI kayıt.
 *  - conscience_log: YALNIZCA prompt-injection blokları (level="critical"); bunlar da
 *                    "engellenen eylem" sayıldığından blockedActions'a katılır.
 *  - circuit-breaker: Ollama AI motorunun gerçek erişilebilirlik/hata metrikleri
 *
 * NOT: Rapor şimdilik global (tüm mağazalar). Admin JWT zorunlu (middlewares.ts).
 */

const QuerySchema = z.object({
    days: z.coerce.number().min(1).max(365).default(30),
})

const TAKE_CAP = 10000

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const logger = req.scope.resolve("logger") as any // audit-ignore: no-as-any (Medusa container resolve)
    const { days } = QuerySchema.parse(req.query)
    const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const query = req.scope.resolve("remoteQuery") as any // audit-ignore: no-as-any (remoteQuery tipsiz)

    // ── Yardımcı: bir entity'yi tarih penceresiyle çek (hata olursa boş + işaretle) ──
    const fetchSince = async (entity: string, fields: string[]) => {
        try {
            const { data } = await query.graph({
                entity,
                fields,
                filters: { created_at: { $gte: windowStart } },
                pagination: { take: TAKE_CAP, skip: 0, order: { created_at: "DESC" } },
            })
            return { rows: data || [], ok: true, truncated: (data?.length || 0) >= TAKE_CAP }
        } catch (e: any) {
            logger.warn(`[TransparencyReport] '${entity}' okunamadı: ${e?.message}`)
            return { rows: [], ok: false, truncated: false }
        }
    }

    // ── 1) Kaynakları çek ──
    // conscience_log: yalnızca prompt-injection blokları (level="critical").
    const conscience = await fetchSince("conscience_log", ["id", "level", "created_at"])
    // memory_truth: AI'ın gerçek eylemleri + etik verdict'leri (tek doğruluk kaynağı).
    const truth = await fetchSince("memory_truth", ["id", "metadata", "created_at"])

    // ── 2) Vicdan (etik filtre) — verdict'ler memory_truth'tan, injection conscience_log'tan ──
    const consc = summarizeConscience(truth.rows, conscience.rows)

    // ── 3) Dürüstlük / gerçeğe bağlılık (memory_truth) ──
    const groundedProductAnswers = countAction(truth.rows, "product_search")
    const denyTruthRecords = consc.aiDenies

    // ── 3) Ollama AI motoru — gerçek dayanıklılık metrikleri (circuit breaker) ──
    let ollama: any = { available: null, state: null, totalRequests: 0, successCount: 0, failureCount: 0, availabilityPct: null }
    try {
        const cb = getCircuitBreaker("ollama")
        const m = cb.metrics
        const total = m.successCount + m.failureCount
        ollama = {
            available: cb.isAvailable,
            state: cb.state,
            totalRequests: m.totalRequests,
            successCount: m.successCount,
            failureCount: m.failureCount,
            // Gerçek oran; hiç istek yoksa null (sıfıra bölme/uydurma yok).
            availabilityPct: total > 0 ? Math.round((m.successCount / total) * 1000) / 10 : null,
        }
    } catch (e: any) {
        logger.warn(`[TransparencyReport] circuit-breaker metrikleri okunamadı: ${e?.message}`)
    }

    return res.status(200).json({
        report: {
            generatedAt: new Date().toISOString(),
            windowDays: days,
            windowStart,
            // Her sayı GERÇEK kaynaktan; uydurma yok. Kaynak okunamazsa ok:false ile işaretli.
            conscience: {
                totalVerdicts: consc.totalVerdicts,
                blockedActions: consc.blockedActions, // AI DENY + injection blokları (güvenlik gerekçesiyle engellenen)
                allowedActions: consc.allowedActions, // AI ALLOW
                // Şeffaflık için kırılım: kaynak ayrımı görünür kalsın
                aiDenies: consc.aiDenies,
                aiAllows: consc.aiAllows,
                injectionBlocks: consc.injectionBlocks,
                sourceOk: truth.ok && conscience.ok,
                truncated: truth.truncated || conscience.truncated,
            },
            honesty: {
                totalTruthRecords: truth.rows.length,
                groundedProductAnswers, // yanıtın gerçek ürün verisine bağlandığı kayıt sayısı
                denyRecords: denyTruthRecords,
                sourceOk: truth.ok,
                truncated: truth.truncated,
            },
            aiEngine: ollama,
        },
    })
}
