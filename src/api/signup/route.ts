/**
 * POST /signup — Self-Servis Mağaza Kaydı (SaaS onboarding)
 * ═════════════════════════════════════════════════════════
 * Bir aday mağaza açar: form → otomatik tenant provizyonu (mevcut create-tenant workflow:
 * tenant + Sales Channel + Stock Location + API Key + mağaza sahibi ADMIN hesabı) → hoş geldin
 * e-postası → admin paneline giriş. Faturalama v1'de elle (deneme/trial).
 *
 * NEDEN /store değil /signup: /store/* route'ları Medusa'nın publishable-key zorunluluğuna tabidir;
 * yeni kaydolan mağazanın henüz key'i YOKTUR. /signup bu zorunluluktan ve tenant-context'ten muaftır.
 * GÜVENLİK: Public + kaynak yaratan uç → KATI rate-limit (spam tenant önlemi).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { Modules } from "@medusajs/framework/utils"
import type { INotificationModuleService } from "@medusajs/framework/types"
import { VALID_SECTORS } from "../../modules/tenant/service"
import { createTenantProvisioningWorkflow } from "../../workflows/create-tenant"
import { slugify, isValidSlug } from "../../lib/signup/slug"
import { createRateLimiter, applyRateLimit } from "../../lib/rate-limiter"

// Public + kaynak yaratan → saatte 5 deneme/IP (kötüye kullanım/spam tenant önlemi).
const signupLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 5 })

const SignupSchema = z.object({
    store_name: z.string().min(2, "Mağaza adı en az 2 karakter olmalı.").max(60),
    sector: z.enum(VALID_SECTORS),
    email: z.string().email("Geçerli bir e-posta gerekli."),
    password: z.string().min(8, "Şifre en az 8 karakter olmalı."),
    owner_name: z.string().max(80).optional(),
    slug: z.string().optional(),
})

export const POST = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
    if (await applyRateLimit(req, res, signupLimiter)) return
    const logger = req.scope.resolve("logger") as { info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void }

    try {
        const data = SignupSchema.parse(req.body)

        const slug = data.slug?.trim() ? slugify(data.slug) : slugify(data.store_name)
        if (!isValidSlug(slug)) {
            res.status(400).json({ error: "Mağaza adından geçerli bir adres üretilemedi. Lütfen harf/rakam içeren bir ad girin." })
            return
        }

        // ─── Provizyon: tenant + altyapı + mağaza sahibi admin (mevcut workflow) ───
        let tenant: unknown
        try {
            const { result } = await createTenantProvisioningWorkflow(req.scope).run({
                input: {
                    name: data.store_name,
                    slug,
                    sector: data.sector,
                    admin_email: data.email,
                    admin_password: data.password,
                    admin_first_name: data.owner_name,
                },
            })
            tenant = result
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e)
            if (/slug|already exists|unique|duplicate|çakış|conflict|kullan/i.test(msg)) {
                res.status(409).json({ error: `'${slug}' adresi veya e-posta zaten alınmış. Farklı bir mağaza adı / e-posta deneyin.` })
                return
            }
            throw e
        }

        // ─── Hoş geldin e-postası (platform şablonu) — best-effort ───
        try {
            const templateId = process.env.BREVO_WELCOME_TEMPLATE_ID
            if (templateId) {
                const notif = req.scope.resolve(Modules.NOTIFICATION) as INotificationModuleService
                const baseUrl = (process.env.STOREFRONT_BASE_URL || "http://localhost:9000").replace(/\/+$/, "")
                await notif.createNotifications({
                    to: data.email,
                    channel: "email",
                    template: templateId,
                    data: { store_name: data.store_name, slug, admin_url: `${baseUrl}/app`, owner_name: data.owner_name ?? null },
                })
            } else {
                logger.warn("[Signup] BREVO_WELCOME_TEMPLATE_ID yok — hoş geldin e-postası gönderilmedi.")
            }
        } catch (e: unknown) {
            logger.warn(`[Signup] Hoş geldin e-postası gönderilemedi: ${e instanceof Error ? e.message : e}`)
        }

        logger.info(`[Signup] Yeni mağaza oluşturuldu: ${data.store_name} (${slug}) — ${data.email}`)
        res.status(201).json({
            success: true,
            slug,
            admin_url: "/app",
            message: "Mağazanız oluşturuldu! Admin paneline e-postanız ve şifrenizle giriş yapabilirsiniz.",
        })
    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: "Geçersiz form verisi.", details: error.issues })
            return
        }
        logger.error(`[Signup] Hata: ${error instanceof Error ? error.stack : String(error)}`)
        res.status(500).json({ error: "Kayıt sırasında bir hata oluştu." })
    }
}
