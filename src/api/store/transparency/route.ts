import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * [GET] /store/transparency  (PUBLIC — müşteriye açık)
 *
 * Dürüstlük markasının GÖRÜNÜR yüzü: AI'ın ne kadar gerçeğe bağlı kaldığını
 * müşteriye kanıtlayan, UYDURMASIZ özet. Admin sürümünün (/admin/transparency-report)
 * yalnızca GÜVENLİ, pozitif ve toplulaştırılmış alt kümesini döndürür:
 *   - İç altyapı metrikleri (Ollama hata sayısı, devre durumu) YOK (müşteriye gerekmez)
 *   - Müşteri verisi / ham log YOK
 *   - Yalnızca gerçek sayımlar; kaynak boşsa 0 (uydurma yok)
 *
 * Kaynaklar (gerçek): conscience_log (engellenen riskli/etik dışı eylemler),
 * memory_truth (AI'ın gerçek ürün verisine bağladığı yanıtlar).
 * Platform geneli (Ayna AI motorunun dürüstlük karnesi).
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const logger = req.scope.resolve("logger") as any // audit-ignore: no-as-any (Medusa container resolve)
    const days = Math.min(Math.max(parseInt((req.query.days as string) || "30", 10) || 30, 1), 365)
    const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const query = req.scope.resolve("remoteQuery") as any // audit-ignore: no-as-any (remoteQuery tipsiz)

    const TAKE = 10000
    const fetchSince = async (entity: string, fields: string[]) => {
        try {
            const { data } = await query.graph({
                entity, fields,
                filters: { created_at: { $gte: windowStart } },
                pagination: { take: TAKE, skip: 0, order: { created_at: "DESC" } },
            })
            return data || []
        } catch (e: any) {
            logger.warn(`[PublicTransparency] '${entity}' okunamadı: ${e?.message}`)
            return []
        }
    }

    const conscience = await fetchSince("conscience_log", ["id", "level"])
    const blockedActions = conscience.filter((r: any) => r.level === "critical").length

    const truth = await fetchSince("memory_truth", ["id", "metadata"])
    const groundedAnswers = truth.filter((r: any) => (r?.metadata?.action || "") === "product_search").length

    res.status(200).json({
        transparency: {
            windowDays: days,
            generatedAt: new Date().toISOString(),
            // Yalnızca pozitif, kanıtlanabilir dürüstlük sayımları (uydurma yok):
            groundedAnswers,        // AI'ın fiyat/stok'u UYDURMAYIP gerçek veriden doğruladığı yanıt sayısı
            blockedActions,         // AI'ın etik/güvenlik gerekçesiyle ENGELLEDİĞİ işlem sayısı
            totalAiRecords: truth.length,  // kayıt altına alınan toplam AI eylemi (şeffaflık)
            note: "Tüm sayılar canlı kayıtlardan okunur; veri yoksa 0 gösterilir, asla uydurulmaz.",
        },
    })
}
