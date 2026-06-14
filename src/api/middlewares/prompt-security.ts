/**
 * Prompt Security Middleware
 *
 * Tarama hedefi: Body, query ve route param'larındaki string alanlar.
 * Algılayıcı: src/modules/conscience/services/injection-detector.service.ts
 * (regex tabanlı, deterministik — DI'ya gerek yok, stateless instantiate).
 *
 * Politika (fail-closed):
 *   - Risk skoru > 70  → 400 BAD_REQUEST, body bloklanır, logger.warn
 *   - Risk skoru 40-70 → uyarı header'ı X-Prompt-Risk eklenir, geçer
 *   - Risk skoru < 40  → temiz, geçer
 *
 * Sadece text içerikli alanlar taranır (max 4KB per field) — büyük binary
 * yükler atlanır.
 */
import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { detectInjection } from "../../modules/conscience/services/injection-detector.patterns"

// conscience modül anahtarı (= CONSCIENCE_MODULE). Modül index'ini import etmiyoruz:
// index `Module()` yan etkisi içerir ve test/derleme ortamını gereksiz yükler.
const CONSCIENCE_MODULE = "conscience"

const MAX_FIELD_LEN = 4096
const BLOCK_THRESHOLD = 70
const WARN_THRESHOLD = 40

type MinimalLogger = { warn: (msg: string, meta?: unknown) => void }
const noopLogger: MinimalLogger = { warn: () => {} }

function* iterateStringFields(obj: unknown, path: string = ""): Generator<{ path: string; value: string }> {
    if (obj == null) return
    if (typeof obj === "string") {
        if (obj.length <= MAX_FIELD_LEN) yield { path, value: obj }
        return
    }
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            yield* iterateStringFields(obj[i], `${path}[${i}]`)
        }
        return
    }
    if (typeof obj === "object") {
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
            yield* iterateStringFields(v, path ? `${path}.${k}` : k)
        }
    }
}

export const promptSecurityMiddleware = async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
): Promise<void> => {
    let logger: MinimalLogger = noopLogger
    try {
        logger = req.scope.resolve("logger") as MinimalLogger
    } catch {
        // logger çözümlenemezse sessiz devam
    }

    let maxRisk = 0
    let blockedField: string | null = null
    const allPatterns: string[] = []

    for (const source of [req.body, req.query, req.params] as const) {
        for (const field of iterateStringFields(source)) {
            const result = detectInjection(field.value)
            if (result.riskScore > maxRisk) maxRisk = result.riskScore
            if (result.detectedPatterns.length > 0) allPatterns.push(...result.detectedPatterns)
            if (result.riskScore > BLOCK_THRESHOLD) {
                blockedField = field.path
                break
            }
        }
        if (blockedField) break
    }

    if (blockedField !== null) {
        logger.warn("[PromptSecurity] Blocked request", {
            path: req.path,
            field: blockedField,
            riskScore: maxRisk,
            patterns: allPatterns,
        })

        // ── GÖZLEMLENEBİLİRLİK: engellenen saldırıyı conscience_log'a (DENY) yaz ──
        // Şeffaflık/Gözlem ekranları conscience_log'tan beslenir; bu kayıt olmadan
        // "Engellenen Eylem" metriği gerçek saldırılar engellense bile 0 kalır.
        // Best-effort: yazım başarısız olursa blok yanıtını ASLA engellemez.
        try {
            const conscience = req.scope.resolve(CONSCIENCE_MODULE) as
                | { createConscienceLogs?: (data: any) => Promise<any> }
                | undefined
            const actorId = (req as any).auth_context?.actor_id
            if (conscience?.createConscienceLogs) {
                await conscience.createConscienceLogs([
                    {
                        customer_id: actorId || "anonymous",
                        level: "critical",
                        message: `Prompt injection engellendi (alan: ${blockedField}).`,
                        metadata: {
                            type: "INJECTION_BLOCKED",
                            riskScore: maxRisk,
                            patterns: allPatterns,
                            path: req.path,
                        },
                    },
                ])
            }
        } catch (e) {
            logger.warn("[PromptSecurity] conscience_log yazılamadı", e)
        }

        res.status(400).json({
            error: "PROMPT_INJECTION_DETECTED",
            message: "Girdi güvenlik denetiminden geçemedi.",
            field: blockedField,
        })
        return
    }

    if (maxRisk >= WARN_THRESHOLD) {
        res.setHeader("X-Prompt-Risk", String(maxRisk))
    }
    return next()
}
