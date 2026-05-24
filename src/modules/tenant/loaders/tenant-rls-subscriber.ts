/**
 * Tenant RLS Subscriber Loader — EventSubscriber Kaydı
 * ═══════════════════════════════════════════════════════════════
 *
 * Bu loader, uygulama başlangıcında TenantRlsSubscriber'ı
 * MikroORM EventManager'a kaydeder. Bu sayede her transaction
 * başlangıcında (afterTransactionStart) SET LOCAL çalıştırılır.
 *
 * ─── NEDEN LOADER? ───
 *
 * MikroORM EventSubscriber'ları otomatik keşfedilmez.
 * Medusa V2'nin modül container'ı izole olduğundan,
 * subscriber'lar modülün loader'ı aracılığıyla kayıt edilmelidir.
 *
 * @see tenant-rls.subscriber.ts (EventSubscriber implementasyonu)
 */

import { LoaderOptions } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { TenantRlsSubscriber } from "../subscribers/tenant-rls.subscriber"

/**
 * TenantRlsSubscriber'ı MikroORM EventManager'a kaydeder.
 */
export default async function tenantRlsSubscriberLoader(
    { container }: LoaderOptions
): Promise<void> {
    try {
        const manager = container.resolve(
            ContainerRegistrationKeys.MANAGER
        )

        // EventManager'a subscriber kaydı
        const eventManager = (manager as any).getEventManager()
        eventManager.registerSubscriber(new TenantRlsSubscriber())
    } catch (error: unknown) {
        // Subscriber kayıt hatası — kritik ama uygulama başlatmayı
        // durdurmak yerine loglayıp devam edelim.
        // RLS politikaları (deny-all varsayılan) hâlâ aktif olacaktır.
        console.error(
            `[TenantRLS] Subscriber kayıt hatası: ` +
            `${error instanceof Error ? error.message : "Bilinmeyen hata"}`
        )
    }
}
