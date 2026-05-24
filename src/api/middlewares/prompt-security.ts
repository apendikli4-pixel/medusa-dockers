/**
 * Prompt Security Middleware — Geçici No-Op Stub
 *
 * Tarihçe: Orijinal implementasyon `InjectionDetectorService`'i çözmeye
 * çalışıyordu, ama o servis modülde implemente edilmemişti. Eski middleware
 * zaten her istekte resolve hatası verip catch'e düşüyordu — yani çalışmıyordu.
 *
 * Bu stub:
 *   - Her isteği bloklamadan geçirir (fail-open, eski davranışla aynı)
 *   - İlk denemede info-level loglar (gerçek detector eklenene kadar
 *     görünür kalsın diye)
 *
 * Gerçek injection detector eklendiğinde:
 *   1. src/modules/conscience/services/injection-detector.service.ts'deki
 *      mevcut implementasyonu kullan (ayna değil, conscience modülünde var!)
 *   2. Bu dosyayı detector'a delegate edecek şekilde yeniden yaz
 *   3. Resolve fail durumunu MedusaError olarak yükselt (fail-closed yap)
 */
import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

let warnedOnce = false

export const promptSecurityMiddleware = async (
    req: MedusaRequest,
    _res: MedusaResponse,
    next: MedusaNextFunction
): Promise<void> => {
    if (!warnedOnce) {
        try {
            const logger = req.scope.resolve("logger") as { warn: (msg: string) => void }
            logger.warn(
                "[PromptSecurity] No-op stub aktif — gerçek injection detector entegre edilmedi. "
                + "Detay: src/api/middlewares/prompt-security.ts header'ı."
            )
        } catch {
            // Logger bile çözülemiyorsa sessiz geç — middleware her halükarda fail-open
        }
        warnedOnce = true
    }
    return next()
}
