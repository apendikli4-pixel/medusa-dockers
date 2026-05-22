/**
 * Admin Tenant Route'ları — Detay (GET) ve Güncelleme (POST)
 *
 * GET  /admin/tenants/:id   → Mağaza detayını getir
 * POST /admin/tenants/:id   → Mağaza bilgilerini güncelle
 *
 * Auth: Admin JWT zorunlu (middlewares.ts'te tanımlı)
 * Validation: Zod ile request body doğrulaması
 *
 * Dürüstlük ilkesi: Her hata açıklayıcı mesaj içerir,
 * sunucu detayları (stack trace vb.) istemciye gösterilmez.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { TENANT_MODULE } from "../../../../modules/tenant"
import type TenantService from "../../../../modules/tenant/service"

// ─── ZOD ŞEMALARI ───

const SectorSchema = z.enum(["retail", "horeca", "b2b", "fashion"])

const FeatureSchema = z.enum([
    "loyalty", "reservations", "subscriptions",
    "wishlist", "b2b_pricing", "pos",
])

/**
 * Mağaza güncelleme şeması.
 * Tüm alanlar opsiyonel — sadece gönderilen alanlar güncellenir.
 */
const UpdateTenantSchema = z.object({
    name: z.string().min(1, "Mağaza adı boş olamaz.").optional(),
    slug: z.string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug sadece küçük harf, rakam ve tire (-) içerebilir.")
        .optional(),
    sector: SectorSchema.optional(),
    settings: z.record(z.unknown()).optional().nullable(),
    features: z.array(FeatureSchema).optional(),
    is_active: z.boolean().optional(),
    owner_id: z.string().optional().nullable(),
    domain: z.string().optional().nullable(),
    metadata: z.record(z.unknown()).optional().nullable(),
})

// ─── GET /admin/tenants/:id — Mağaza Detayı ───

/**
 * ID'ye göre tek bir mağazanın detay bilgilerini getirir.
 *
 * Param: id (UUID)
 * Response: { tenant: Tenant }
 * Hata: 404 (bulunamadı), 500 (sunucu hatası)
 */
export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    try {
        const tenantService = req.scope.resolve(TENANT_MODULE) as TenantService
        const { id } = req.params

        if (!id) {
            return res.status(400).json({ error: "Mağaza ID'si zorunludur." })
        }

        const result = await tenantService.get(id)

        if (!result.success) {
            return res.status(404).json({ error: result.message })
        }

        return res.json({ tenant: result.data })

    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any
        logger.error(`[Tenant API] Detay getirme hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`)
        return res.status(500).json({
            error: "Mağaza bilgileri getirilirken bir hata oluştu.",
        })
    }
}

// ─── POST /admin/tenants/:id — Mağaza Güncelle ───

/**
 * Mevcut bir mağazanın bilgilerini günceller.
 *
 * Param: id (UUID)
 * Body (JSON): UpdateTenantDTO — tüm alanlar opsiyonel
 * Response: { tenant: Tenant, message: string }
 * Hata: 400 (validasyon), 404 (bulunamadı), 500 (sunucu hatası)
 *
 * NOT: GENESIS_PROTOCOL'e göre mutasyon işlemleri POST/PUT/DELETE kullanmalı.
 * Bu yüzden güncelleme GET yerine POST ile yapılır.
 */
export const POST = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    try {
        const tenantService = req.scope.resolve(TENANT_MODULE) as TenantService
        const { id } = req.params

        if (!id) {
            return res.status(400).json({ error: "Mağaza ID'si zorunludur." })
        }

        // ─── Request body'yi Zod ile doğrula ───
        const data = UpdateTenantSchema.parse(req.body)

        // ─── Boş güncelleme kontrolü ───
        if (Object.keys(data).length === 0) {
            return res.status(400).json({
                error: "Güncellenecek en az bir alan gönderilmelidir.",
            })
        }

        // ─── Servisi çağır ───
        const result = await tenantService.update(id, data)

        if (!result.success) {
            // Bulunamadı veya validasyon hatası
            const status = result.message.includes("bulunamadı") ? 404 : 400
            return res.status(status).json({ error: result.message })
        }

        return res.json({
            tenant: result.data,
            message: result.message,
        })

    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: "Geçersiz güncelleme verisi.",
                details: error.errors,
            })
        }

        logger.error(`[Tenant API] Güncelleme hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`)
        return res.status(500).json({
            error: "Mağaza güncellenirken bir hata oluştu.",
        })
    }
}
