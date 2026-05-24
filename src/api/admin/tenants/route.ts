/**
 * Admin Tenant Route'ları — Liste (GET) ve Oluşturma (POST)
 *
 * GET  /admin/tenants       → Tüm mağazaları listele (filtreleme + sayfalama)
 * POST /admin/tenants       → Yeni mağaza oluştur
 *
 * Auth: Admin JWT zorunlu (middlewares.ts'te tanımlı)
 * Validation: Zod ile request body/query doğrulaması
 *
 * GENESIS_PROTOCOL kuralları:
 * - Zod validasyonu zorunlu (req.body as any YASAK)
 * - error.stack response'a yazılmaz
 * - Hata detayları logger ile sunucu tarafında loglanır
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { TENANT_MODULE } from "../../../modules/tenant"
import type TenantService from "../../../modules/tenant/service"

// ─── ZOD ŞEMALARI ───

/**
 * Sektör enum değerleri — model ile senkron tutulmalı.
 */
const SectorSchema = z.enum(["retail", "horeca", "b2b", "fashion"])

/**
 * Desteklenen özellikler — yalnızca bu değerler kabul edilir.
 */
const FeatureSchema = z.enum([
    "loyalty", "reservations", "subscriptions",
    "wishlist", "b2b_pricing", "pos",
])

/**
 * Mağaza oluşturma şeması.
 * Zorunlu alanlar: name, slug, sector
 * Slug: sadece küçük harf, rakam ve tire
 */
const CreateTenantSchema = z.object({
    name: z.string().min(1, "Mağaza adı zorunludur."),
    slug: z.string()
        .min(1, "Slug zorunludur.")
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug sadece küçük harf, rakam ve tire (-) içerebilir."),
    sector: SectorSchema,
    // createTenantProvisioningWorkflow tarafından zorunlu — yeni mağaza yönetici hesabı
    admin_email: z.string().min(3, "Yönetici e-postası zorunludur."),
    admin_password: z.string().min(8, "Yönetici şifresi en az 8 karakter olmalıdır."),
    admin_first_name: z.string().optional(),
    admin_last_name: z.string().optional(),
    settings: z.record(z.string(), z.unknown()).optional().nullable(),
    features: z.array(FeatureSchema).optional(),
    owner_id: z.string().optional().nullable(),
    domain: z.string().optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

/**
 * Listeleme query parametreleri şeması.
 * Tüm filtreler opsiyoneldir.
 */
const ListTenantsQuerySchema = z.object({
    limit: z.coerce.number().min(1).max(100).optional().default(20),
    offset: z.coerce.number().min(0).optional().default(0),
    sector: SectorSchema.optional(),
    is_active: z.enum(["true", "false"]).optional().transform(v => v === "true"),
    name: z.string().optional(),
})

// ─── GET /admin/tenants — Mağaza Listesi ───

/**
 * Tüm mağazaları listeler.
 *
 * Query parametreleri:
 * - limit (number, varsayılan: 20, maks: 100) — sayfa başına kayıt
 * - offset (number, varsayılan: 0) — başlangıç noktası
 * - sector (string, opsiyonel) — sektöre göre filtrele
 * - is_active (boolean, opsiyonel) — aktiflik durumuna göre filtrele
 * - name (string, opsiyonel) — isme göre arama
 *
 * Response: { tenants: Tenant[], count: number }
 */
export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    try {
        const tenantService = req.scope.resolve(TENANT_MODULE) as TenantService

        // ─── Query parametrelerini Zod ile doğrula ───
        const parsed = ListTenantsQuerySchema.parse(req.query)

        // ─── Filtreleri oluştur ───
        const filters: Record<string, unknown> = {}
        if (parsed.sector) filters.sector = parsed.sector
        if (parsed.is_active !== undefined) filters.is_active = parsed.is_active
        if (parsed.name) filters.name = parsed.name

        // ─── Servisi çağır ───
        const result = await tenantService.list(
            filters,
            { take: parsed.limit, skip: parsed.offset }
        )

        if (!result.success) {
            return res.status(500).json({ error: result.message })
        }

        return res.json({
            tenants: result.data?.tenants || [],
            count: result.data?.count || 0,
        })

    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any

        // ─── Zod validasyon hatası → 400 ───
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: "Geçersiz sorgu parametreleri.",
                details: error.issues,
            })
        }

        // ─── Beklenmeyen hata → 500 (detaylar sunucu logunda) ───
        logger.error(`[Tenant API] Listeleme hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`)
        return res.status(500).json({
            error: "Mağazalar listelenirken bir hata oluştu.",
        })
    }
}

// ─── POST /admin/tenants — Yeni Mağaza Oluştur ───

/**
 * Yeni bir mağaza oluşturur.
 *
 * Body (JSON):
 * - name (string, zorunlu) — mağaza adı
 * - slug (string, zorunlu) — benzersiz URL tanımlayıcı
 * - sector (string, zorunlu) — "retail" | "horeca" | "b2b" | "fashion"
 * - settings (object, opsiyonel) — mağaza özel ayarları
 * - features (string[], opsiyonel) — aktif özellikler
 * - owner_id (string, opsiyonel) — mağaza sahibi
 * - domain (string, opsiyonel) — özel alan adı
 * - metadata (object, opsiyonel) — ek veriler
 *
 * Response: { tenant: Tenant }
 * Hata: 400 (validasyon), 409 (slug/domain çakışması), 500 (sunucu hatası)
 */
export const POST = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    try {
        const tenantService = req.scope.resolve(TENANT_MODULE) as TenantService

        // ─── Request body'yi Zod ile doğrula ───
        const data = CreateTenantSchema.parse(req.body)

        // ─── Servisi çağır (validasyon + oluşturma) ───
        const { createTenantWorkflow } = await import("../../../workflows/create-tenant.js")
        // Zod nullable() workflow input'undaki optional ile birebir uymadığı için
        // explicit cast — runtime payload aynı, sadece tip kontrolü uyumu.
        const { result } = await createTenantWorkflow(req.scope).run({
            input: {
                ...data,
                domain: data.domain ?? undefined,
                settings: data.settings ?? undefined,
            },
        })

        return res.status(201).json({
            tenant: result,
            message: "Mağaza ve ilgili altyapı (Satış Kanalı, Depo, API Anahtarı) başarıyla oluşturuldu.",
        })

    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: "Geçersiz istek verisi.",
                details: error.issues,
            })
        }

        logger.error(`[Tenant API] Oluşturma hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`)
        return res.status(500).json({
            error: "Mağaza oluşturulurken bir hata oluştu.",
        })
    }
}
