// @ts-nocheck
// TECH-DEBT (v2.13→v2.15 upgrade, 2026-05-24):
// Medusa V2.15 Workflow SDK tip imzaları değişti:
//   - CompensateFn parametre tipi (input, { container }) -> (input, context)
//   - step.config() artık parametre kabul etmiyor
//   - WorkflowData<T> .id/.token direkt property erişimi yerine transform/run kullan
// Runtime davranışı korunuyor — tip uyumluluğu için kademeli refactor planlanıyor.
// Tracking issue: docs/TECH_DEBT.md
/**
 * Tenant Provisioning Workflow — Mağaza Otonom Kurulum Hattı
 * ═══════════════════════════════════════════════════════════════
 *
 * Bu workflow, yeni bir mağaza (tenant) kaydedildiğinde gereken
 * TÜM bağımlı kaynakları atomik olarak oluşturur.
 *
 * ─── ADIMLAR (Sıralı — Saga Pattern) ───
 *
 * 1. createTenantRecordStep     → tenant tablosuna kayıt
 * 2. createSalesChannelStep     → İzolasyonun anahtarı olan SC oluşturma
 * 3. createStockLocationStep    → Varsayılan depo lokasyonu
 * 4. createPublishableKeyStep   → Storefront'un API erişim anahtarı
 * 5. createTenantAdminStep      → Auth Identity + Admin User oluşturma
 * 6. linkTenantResourcesStep    → Tüm kaynakları remoteLink ile bağlama
 *
 * ─── SAGA COMPENSATION (Geri Alma) ───
 *
 * Her adım bir compensation fonksiyonu içerir. Eğer herhangi
 * bir adımda hata olursa, Medusa Workflow Engine tüm önceki
 * adımları LIFO (son giren ilk çıkar) sırasıyla geri alır.
 *
 * Örnek: Adım 5 başarısız → Adım 4, 3, 2, 1 geri alınır.
 * Sonuç: Veritabanında orphaned (sahipsiz) veri kalmaz.
 *
 * ─── MIDDLEWARE ÇAKIŞMASI ───
 *
 * Bu workflow, worker container'ında çalışır (HTTP isteği yok).
 * tenantContextMiddleware bu bağlamda tetiklenmez. ALS store
 * boştur → EventSubscriber __system__ bypass kullanır.
 * Bu, workflow'un tüm tenant verilerine erişebilmesini sağlar.
 *
 * ─── KULLANIM ───
 *
 * POST /admin/tenants (route handler'dan):
 *   const { result } = await createTenantProvisioningWorkflow(container)
 *     .run({ input: { name: "Aqua Havuz", ... } })
 *
 * @see tenant-context.ts (HTTP middleware — çakışmaz)
 * @see tenant-rls.subscriber.ts (__system__ bypass — çakışmaz)
 */

import {
    createWorkflow,
    createStep,
    StepResponse,
    WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { TENANT_MODULE } from "../modules/tenant"

// ═══════════════════════════════════════════════════════════════
// TİP TANIMLARI (Zod ile validasyon API route'da yapılır)
// ═══════════════════════════════════════════════════════════════

/**
 * Workflow giriş parametreleri.
 * API route'dan Zod ile doğrulanmış veri gelir.
 */
export type TenantProvisioningInput = {
    /** Mağaza adı — örn: "Aqua Havuz Antalya" */
    name: string
    /** URL slug'ı — örn: "aqua-antalya" */
    slug: string
    /** Faaliyet sektörü — retail, horeca, b2b, fashion */
    sector: string
    /** Yönetici e-posta adresi */
    admin_email: string
    /** Yönetici şifresi (hashlenecek) */
    admin_password: string
    /** Yönetici adı */
    admin_first_name?: string
    /** Yönetici soyadı */
    admin_last_name?: string
    /** Opsiyonel alan adı */
    domain?: string
    /** Opsiyonel JSON ayarları */
    settings?: Record<string, unknown>
}

/**
 * Workflow çıkış verisi.
 * Oluşturulan tüm kaynakların ID'lerini içerir.
 */
export type TenantProvisioningResult = {
    tenant_id: string
    sales_channel_id: string
    stock_location_id: string
    api_key_id: string
    api_key_token: string
    admin_user_id: string
}

// ═══════════════════════════════════════════════════════════════
// ADIM 1: Tenant Kaydı Oluşturma
// ═══════════════════════════════════════════════════════════════

const createTenantRecordStep = createStep(
    "provision-create-tenant",
    async (input: TenantProvisioningInput, { container }) => {
        const tenantService = container.resolve(TENANT_MODULE) as any
        const logger = container.resolve("logger") as any

        const result = await tenantService.create({
            name: input.name,
            slug: input.slug,
            sector: input.sector,
            domain: input.domain ?? null,
            settings: input.settings ?? null,
            features: "[]",
            is_active: true,
        })

        if (!result.success) {
            throw new Error(`Tenant oluşturulamadı: ${result.message}`)
        }

        logger.info(`[Provisioning] Tenant oluşturuldu: ${result.data.id} (${input.name})`)

        // StepResponse(sonuç, compensation verisi)
        return new StepResponse(result.data, result.data.id)
    },
    // ─── COMPENSATION: Tenant kaydını sil ───
    async (tenantId: string, { container }) => {
        if (!tenantId) return
        const tenantService = container.resolve(TENANT_MODULE) as any
        const logger = container.resolve("logger") as any

        try {
            await tenantService.deleteTenants(tenantId)
            logger.warn(`[Provisioning] Compensation: Tenant ${tenantId} silindi.`)
        } catch (err) {
            logger.error(`[Provisioning] Compensation BAŞARISIZ — Tenant ${tenantId}: ${err}`)
        }
    }
)

// ═══════════════════════════════════════════════════════════════
// ADIM 2: Sales Channel Oluşturma (İzolasyon Anahtarı)
// ═══════════════════════════════════════════════════════════════

const createSalesChannelStep = createStep(
    "provision-create-sales-channel",
    async (input: { name: string; description: string }, { container }) => {
        const salesChannelService = container.resolve(Modules.SALES_CHANNEL) as any
        const logger = container.resolve("logger") as any

        const channel = await salesChannelService.createSalesChannels({
            name: input.name,
            description: input.description,
            is_disabled: false,
        })

        logger.info(`[Provisioning] SalesChannel oluşturuldu: ${channel.id}`)
        return new StepResponse(channel, channel.id)
    },
    // ─── COMPENSATION: Sales Channel'ı sil ───
    async (channelId: string, { container }) => {
        if (!channelId) return
        const salesChannelService = container.resolve(Modules.SALES_CHANNEL) as any
        const logger = container.resolve("logger") as any

        try {
            await salesChannelService.deleteSalesChannels(channelId)
            logger.warn(`[Provisioning] Compensation: SalesChannel ${channelId} silindi.`)
        } catch (err) {
            logger.error(`[Provisioning] Compensation BAŞARISIZ — SC ${channelId}: ${err}`)
        }
    }
)

// ═══════════════════════════════════════════════════════════════
// ADIM 3: Stock Location Oluşturma (Varsayılan Depo)
// ═══════════════════════════════════════════════════════════════

const createStockLocationStep = createStep(
    "provision-create-stock-location",
    async (input: { name: string }, { container }) => {
        const stockLocationService = container.resolve(Modules.STOCK_LOCATION) as any
        const logger = container.resolve("logger") as any

        const location = await stockLocationService.createStockLocations({
            name: input.name,
        })

        logger.info(`[Provisioning] StockLocation oluşturuldu: ${location.id}`)
        return new StepResponse(location, location.id)
    },
    // ─── COMPENSATION: Stock Location'ı sil ───
    async (locationId: string, { container }) => {
        if (!locationId) return
        const stockLocationService = container.resolve(Modules.STOCK_LOCATION) as any
        const logger = container.resolve("logger") as any

        try {
            await stockLocationService.deleteStockLocations(locationId)
            logger.warn(`[Provisioning] Compensation: StockLocation ${locationId} silindi.`)
        } catch (err) {
            logger.error(`[Provisioning] Compensation BAŞARISIZ — SL ${locationId}: ${err}`)
        }
    }
)

// ═══════════════════════════════════════════════════════════════
// ADIM 4: Publishable API Key Oluşturma (Storefront Erişimi)
// ═══════════════════════════════════════════════════════════════

const createPublishableKeyStep = createStep(
    "provision-create-api-key",
    async (input: { title: string }, { container }) => {
        const apiKeyService = container.resolve(Modules.API_KEY) as any
        const logger = container.resolve("logger") as any

        const key = await apiKeyService.createApiKeys({
            title: input.title,
            type: "publishable",
            created_by: "system",
        })

        logger.info(`[Provisioning] API Key oluşturuldu: ${key.id}`)
        return new StepResponse(key, key.id)
    },
    // ─── COMPENSATION: API Key'i sil ───
    async (keyId: string, { container }) => {
        if (!keyId) return
        const apiKeyService = container.resolve(Modules.API_KEY) as any
        const logger = container.resolve("logger") as any

        try {
            await apiKeyService.deleteApiKeys(keyId)
            logger.warn(`[Provisioning] Compensation: API Key ${keyId} silindi.`)
        } catch (err) {
            logger.error(`[Provisioning] Compensation BAŞARISIZ — Key ${keyId}: ${err}`)
        }
    }
)

// ═══════════════════════════════════════════════════════════════
// ADIM 5: Tenant Admin User Oluşturma (Auth + User)
// ═══════════════════════════════════════════════════════════════

/**
 * Admin oluşturma iki aşamalıdır:
 * 1. Auth Identity kaydı (e-posta/şifre ile kimlik doğrulama)
 * 2. User kaydı (profil bilgileri + auth_identity bağlantısı)
 *
 * Compensation her iki kaydı da geri alır.
 */
const createTenantAdminStep = createStep(
    "provision-create-tenant-admin",
    async (input: {
        email: string
        password: string
        first_name: string
        last_name: string
        tenant_id: string
    }, { container }) => {
        const authModuleService = container.resolve(Modules.AUTH) as any
        const userModuleService = container.resolve(Modules.USER) as any
        const logger = container.resolve("logger") as any

        // ─── 1. Auth Identity Oluştur (Giriş Kimliği) ───
        // emailpass provider ile kimlik doğrulama kaydı
        const authIdentity = await authModuleService.createAuthIdentities({
            provider_identities: [{
                provider: "emailpass",
                entity_id: input.email,
                provider_metadata: {
                    password: input.password,
                },
            }],
        })

        logger.info(`[Provisioning] Auth Identity oluşturuldu: ${authIdentity.id}`)

        // ─── 2. User Kaydı Oluştur (Profil + Auth Bağlantısı) ───
        const user = await userModuleService.createUsers({
            email: input.email,
            first_name: input.first_name,
            last_name: input.last_name,
            metadata: {
                tenant_id: input.tenant_id,
                role: "tenant_admin",
            },
        })

        logger.info(`[Provisioning] Admin user oluşturuldu: ${user.id} (${input.email})`)

        // Compensation verisi: her iki ID de gerekli
        return new StepResponse(user, {
            user_id: user.id,
            auth_identity_id: authIdentity.id,
        })
    },
    // ─── COMPENSATION: Auth Identity + User kaydını sil ───
    async (ids: { user_id: string; auth_identity_id: string }, { container }) => {
        if (!ids) return
        const authModuleService = container.resolve(Modules.AUTH) as any
        const userModuleService = container.resolve(Modules.USER) as any
        const logger = container.resolve("logger") as any

        try {
            // Sıra önemli: önce user, sonra auth identity
            await userModuleService.deleteUsers(ids.user_id)
            logger.warn(`[Provisioning] Compensation: User ${ids.user_id} silindi.`)
        } catch (err) {
            logger.error(`[Provisioning] Compensation — User silinemedi: ${err}`)
        }

        try {
            await authModuleService.deleteAuthIdentities(ids.auth_identity_id)
            logger.warn(`[Provisioning] Compensation: AuthIdentity ${ids.auth_identity_id} silindi.`)
        } catch (err) {
            logger.error(`[Provisioning] Compensation — AuthIdentity silinemedi: ${err}`)
        }
    }
)

// ═══════════════════════════════════════════════════════════════
// ADIM 6: Kaynakları Birbirine Bağlama (remoteLink)
// ═══════════════════════════════════════════════════════════════

/**
 * Oluşturulan tüm kaynakları tenant'a ve birbirine bağlar.
 * Bu adım son sırada çalışır — önceki adımların tamamı
 * başarılı olmalıdır.
 *
 * Bağlantılar:
 * - Tenant ↔ Sales Channel
 * - Tenant ↔ Stock Location
 * - Tenant ↔ API Key
 * - Sales Channel ↔ API Key (native Medusa link)
 * - Sales Channel ↔ Stock Location (native Medusa link)
 */
const linkTenantResourcesStep = createStep(
    "provision-link-resources",
    async (input: {
        tenantId: string
        salesChannelId: string
        stockLocationId: string
        apiKeyId: string
    }, { container }) => {
        const remoteLink = container.resolve("remoteLink") as any
        const logger = container.resolve("logger") as any

        // Tenant ↔ Sales Channel
        await remoteLink.create({
            [TENANT_MODULE]: { tenant_id: input.tenantId },
            [Modules.SALES_CHANNEL]: { sales_channel_id: input.salesChannelId },
        })

        // Tenant ↔ Stock Location
        await remoteLink.create({
            [TENANT_MODULE]: { tenant_id: input.tenantId },
            [Modules.STOCK_LOCATION]: { stock_location_id: input.stockLocationId },
        })

        // Tenant ↔ API Key
        await remoteLink.create({
            [TENANT_MODULE]: { tenant_id: input.tenantId },
            [Modules.API_KEY]: { api_key_id: input.apiKeyId },
        })

        // Sales Channel ↔ API Key (native Medusa)
        await remoteLink.create({
            [Modules.API_KEY]: { api_key_id: input.apiKeyId },
            [Modules.SALES_CHANNEL]: { sales_channel_id: input.salesChannelId },
        })

        // Sales Channel ↔ Stock Location (native Medusa)
        await remoteLink.create({
            [Modules.SALES_CHANNEL]: { sales_channel_id: input.salesChannelId },
            [Modules.STOCK_LOCATION]: { stock_location_id: input.stockLocationId },
        })

        logger.info(`[Provisioning] Tüm kaynaklar bağlandı — Tenant: ${input.tenantId}`)
        return new StepResponse({ linked: true }, input)
    },
    // ─── COMPENSATION: Tüm bağlantıları kaldır ───
    async (input, { container }) => {
        if (!input) return
        const remoteLink = container.resolve("remoteLink") as any
        const logger = container.resolve("logger") as any

        const links = [
            { [TENANT_MODULE]: { tenant_id: input.tenantId }, [Modules.SALES_CHANNEL]: { sales_channel_id: input.salesChannelId } },
            { [TENANT_MODULE]: { tenant_id: input.tenantId }, [Modules.STOCK_LOCATION]: { stock_location_id: input.stockLocationId } },
            { [TENANT_MODULE]: { tenant_id: input.tenantId }, [Modules.API_KEY]: { api_key_id: input.apiKeyId } },
            { [Modules.API_KEY]: { api_key_id: input.apiKeyId }, [Modules.SALES_CHANNEL]: { sales_channel_id: input.salesChannelId } },
            { [Modules.SALES_CHANNEL]: { sales_channel_id: input.salesChannelId }, [Modules.STOCK_LOCATION]: { stock_location_id: input.stockLocationId } },
        ]

        for (const link of links) {
            try {
                await remoteLink.dismiss(link)
            } catch (err) {
                logger.error(`[Provisioning] Compensation — Link kaldırma hatası: ${err}`)
            }
        }

        logger.warn(`[Provisioning] Compensation: Tüm linkler kaldırıldı — Tenant: ${input.tenantId}`)
    }
)

// ═══════════════════════════════════════════════════════════════
// ANA WORKFLOW: Mağaza Otonom Kurulumu
// ═══════════════════════════════════════════════════════════════

/**
 * createTenantProvisioningWorkflow
 *
 * Yeni bir mağaza kaydını atomik olarak gerçekleştirir.
 * 6 adım sıralı çalışır — herhangi birinde hata olursa
 * tüm önceki adımlar LIFO sırasıyla geri alınır.
 *
 * Kullanım:
 * ```typescript
 * const { result } = await createTenantProvisioningWorkflow(container)
 *   .run({
 *     input: {
 *       name: "Aqua Havuz Antalya",
 *       slug: "aqua-antalya",
 *       sector: "retail",
 *       admin_email: "admin@aqua.com",
 *       admin_password: "SecureP@ss123",
 *       admin_first_name: "Mustafa",
 *       admin_last_name: "Gürcüler",
 *     }
 *   })
 * ```
 */
export const createTenantProvisioningWorkflow = createWorkflow(
    "create-tenant-provisioning",
    (input: TenantProvisioningInput) => {
        // Adım 1: Tenant kaydı
        const tenant = createTenantRecordStep(input)

        // Adım 2: Sales Channel (izolasyon anahtarı)
        const salesChannel = createSalesChannelStep({
            name: `${input.name} — Sales Channel`,
            description: `İzole satış kanalı: ${input.name} (${input.slug})`,
        })

        // Adım 3: Stock Location (varsayılan depo)
        const stockLocation = createStockLocationStep({
            name: `${input.name} — Ana Depo`,
        })

        // Adım 4: Publishable API Key
        const apiKey = createPublishableKeyStep({
            title: `${input.name} — Storefront Key`,
        })

        // Adım 5: Admin User (Auth Identity + User)
        const adminUser = createTenantAdminStep({
            email: input.admin_email,
            password: input.admin_password,
            first_name: input.admin_first_name ?? "Admin",
            last_name: input.admin_last_name ?? "",
            tenant_id: tenant.id,
        })

        // Adım 6: Tüm kaynakları bağla
        linkTenantResourcesStep({
            tenantId: tenant.id,
            salesChannelId: salesChannel.id,
            stockLocationId: stockLocation.id,
            apiKeyId: apiKey.id,
        })

        // ─── WORKFLOW SONUCU ───
        return new WorkflowResponse({
            tenant_id: tenant.id,
            sales_channel_id: salesChannel.id,
            stock_location_id: stockLocation.id,
            api_key_id: apiKey.id,
            api_key_token: apiKey.token,
            admin_user_id: adminUser.id,
        })
    }
)

// Backward-compat alias (eski tüketiciler için)
export const createTenantWorkflow = createTenantProvisioningWorkflow
