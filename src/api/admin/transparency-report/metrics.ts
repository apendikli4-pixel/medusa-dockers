/**
 * Şeffaflık Raporu — saf sayma yardımcıları.
 *
 * Route handler'dan ayrı tutulur ki Medusa çalışma-anı altyapısı (remoteQuery,
 * container) olmadan birim test edilebilsin.
 *
 * TEK DOĞRULUK KAYNAĞI kararı (2026-06-15):
 *  - AI'ın etik verdict'leri (ALLOW/DENY) YALNIZCA memory_truth'tan okunur
 *    (metadata.action = "conscience_allow" / "conscience_deny").
 *    Bunları executeConscienceCheck (tool-service.ts) recordTruth ile yazar.
 *  - conscience_log YALNIZCA prompt-injection bloklarını tutar (level="critical");
 *    bunlar da "engellenen eylem" olduğundan blockedActions'a dahil edilir.
 *
 * Uydurma yok: kaynak boşsa her sayı 0 döner.
 */

export type MetricRow = {
    metadata?: { action?: string } | null
    level?: string | null
}

/** memory_truth satırından metadata.action'ı güvenli oku (yoksa boş string). */
export const actionOf = (r: MetricRow): string => (r?.metadata?.action as string) || ""

/** Verilen action'a sahip satırları say. */
export const countAction = (rows: MetricRow[], action: string): number =>
    rows.filter((r) => actionOf(r) === action).length

export type ConscienceSummary = {
    blockedActions: number
    allowedActions: number
    totalVerdicts: number
    aiDenies: number
    aiAllows: number
    injectionBlocks: number
}

/**
 * Vicdan panelini tek kaynaktan özetler.
 * @param truthRows      memory_truth satırları (AI verdict'leri)
 * @param conscienceRows conscience_log satırları (yalnızca injection blokları)
 *
 * blockedActions = AI DENY (conscience_deny) + injection blokları (level=critical)
 * allowedActions = AI ALLOW (conscience_allow)
 */
export const summarizeConscience = (
    truthRows: MetricRow[],
    conscienceRows: MetricRow[]
): ConscienceSummary => {
    const aiDenies = countAction(truthRows, "conscience_deny")
    const aiAllows = countAction(truthRows, "conscience_allow")
    const injectionBlocks = conscienceRows.filter((r) => r.level === "critical").length
    const blockedActions = aiDenies + injectionBlocks
    const allowedActions = aiAllows
    return {
        blockedActions,
        allowedActions,
        totalVerdicts: blockedActions + allowedActions,
        aiDenies,
        aiAllows,
        injectionBlocks,
    }
}
