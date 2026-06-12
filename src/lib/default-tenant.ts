import { TENANT_MODULE } from "../modules/tenant"

/**
 * Varsayılan mağazanın (tenant) id'sini bulur — blog yazısı / sayfa oluşturulurken
 * mağaza belirtilmemişse içerik bu mağazaya bağlanır.
 *
 * Çözümleme sırası (hardcode slug varsayımı YOK — bkz. Migration20260612090000 dersi):
 *   1) DEFAULT_TENANT_ID env (gerçekten var mı diye doğrulanır; 'tnt_default' gibi
 *      bayat değerlere karşı korumalı)
 *   2) slug='default' (eski kurulumlar için geriye uyumluluk)
 *   3) en eski tenant (ilk kurulan mağaza = varsayılan mağaza)
 * Hiç tenant yoksa null döner (içerik mağazasız kalır ve hiçbir vitrinde görünmez).
 */
export async function resolveDefaultTenantId(scope: { resolve: (key: string) => unknown }): Promise<string | null> {
    try {
        const tenantService = scope.resolve(TENANT_MODULE) as any

        const envId = process.env.DEFAULT_TENANT_ID
        if (envId) {
            try {
                const t = await tenantService.retrieveTenant(envId)
                if (t?.id) return t.id
            } catch {
                // env'deki id veritabanında yok → sıradaki adaya geç
            }
        }

        const legacy = await tenantService.findBySlug("default")
        if (legacy?.id) return legacy.id

        const oldest = await tenantService.listTenants({}, { take: 1, order: { created_at: "ASC" } })
        return oldest?.[0]?.id || null
    } catch {
        return null
    }
}
