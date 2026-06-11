/**
 * StoreConfig Backfill — hardcode'dan config'e veri taşıma (İDEMPOTENT).
 *
 * Sunum katmanındaki mağazaya-özel hardcode değerler (Footer fallback'leri,
 * chat karşılaması, yaş kapısı) silinmeden ÖNCE sahiplerinin
 * tenant.settings.storefront config'ine yazılır — yoksa vitrinler boşalır.
 *
 * Kural: yalnızca EKSİK alanlar doldurulur; admin'in Vitrin Ayarları'ndan
 * girdiği mevcut değerler ASLA ezilmez. Tekrar çalıştırmak güvenlidir
 * (start.sh her deploy'da çağırır).
 *
 * Çalıştırma: npx medusa exec ./src/scripts/backfill-store-config.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import type { StoreConfig } from "../modules/tenant/store-config"

/**
 * Derin "yalnızca eksikleri doldur" birleştirmesi.
 * target'ta değer varsa (null/undefined değilse) dokunulmaz; yoksa defaults'tan alınır.
 */
function fillMissing(target: Record<string, any>, defaults: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = { ...target }
    for (const [key, defVal] of Object.entries(defaults)) {
        const cur = out[key]
        if (cur === undefined || cur === null) {
            out[key] = defVal
        } else if (
            typeof cur === "object" && !Array.isArray(cur) &&
            typeof defVal === "object" && defVal !== null && !Array.isArray(defVal)
        ) {
            out[key] = fillMissing(cur, defVal)
        }
        // string/array/boolean mevcutsa dokunma (admin değeri kazanır)
    }
    return out
}

/** Mağaza başına taşınan eski hardcode değerler (Footer.tsx, use-ayna-chat.ts, AgeGate). */
const BACKFILL: Record<string, StoreConfig> = {
    // Aqua Havuz (varsayılan mağaza)
    "default": {
        branding: {
            description: "Havuzunuzun berraklığı için ihtiyacınız olan her şey. Dürüstlük odaklı, yapay zekâ destekli alışveriş deneyimi.",
            keywords: ["havuz malzemeleri", "havuz kimyasalları", "havuz bakımı"],
        },
        contact: {
            person: "Mustafa Gürcüler",
            phone: "0507 561 31 34",
            email: "destek@aquahavuz.com",
            address: "Kuşadası / Merkez",
        },
        ai: {
            greeting: "Merhaba! Ben Ayna. Havuz malzemeleri, bakım tavsiyeleri veya siparişleriniz hakkında size nasıl yardımcı olabilirim?",
        },
        // href'ler ülke-base'ine görelidir ("" = mağaza anasayfası) — Footer base'i ekler.
        footer: {
            categoryLinks: [
                { label: "Havuz Kimyasalları", href: "" },
                { label: "Filtre & Pompa", href: "" },
                { label: "Temizlik Ekipmanları", href: "" },
                { label: "Tüm Ürünler", href: "" },
            ],
        },
    },
    // Vozol (vape mağazası)
    "vozol": {
        branding: {
            description: "Vozol kullan-at elektronik sigara çeşitleri. Orijinal ürün, güvenli ödeme ve hızlı kargo.",
            keywords: ["elektronik sigara", "vozol", "puff bar"],
        },
        contact: {
            person: "Mustafa Gürcüler",
            phone: "0507 561 31 34",
        },
        ai: {
            greeting: "Merhaba! Ben Ayna. Vozol ürünleri veya siparişleriniz hakkında size nasıl yardımcı olabilirim?",
        },
        ageGate: {
            enabled: true,
            message: "Bu ürünler nikotin içerir ve yalnızca 18 yaş ve üzeri kişilere yöneliktir.",
        },
        footer: {
            categoryLinks: [
                { label: "Kullan-At Elektronik Sigara", href: "" },
                { label: "Tüm Ürünler", href: "" },
            ],
        },
    },
}

export default async function backfillStoreConfig({ container }: ExecArgs) {
    const logger = container.resolve("logger") as any
    const tenantService = container.resolve("tenant") as any

    for (const [slug, defaults] of Object.entries(BACKFILL)) {
        try {
            const tenant = await tenantService.findBySlug(slug)
            if (!tenant) {
                logger.warn(`[StoreConfig Backfill] '${slug}' mağazası bulunamadı — atlandı.`)
                continue
            }

            const settings = (tenant.settings ?? {}) as Record<string, any>
            const current = (settings.storefront ?? {}) as Record<string, any>
            const merged = fillMissing(current, defaults as Record<string, any>)

            if (JSON.stringify(merged) === JSON.stringify(current)) {
                logger.info(`[StoreConfig Backfill] '${slug}' güncel — değişiklik yok.`)
                continue
            }

            await tenantService.updateTenants([{
                id: tenant.id,
                settings: { ...settings, storefront: merged },
            }])
            logger.info(`[StoreConfig Backfill] '${slug}' dolduruldu (yalnızca eksik alanlar).`)
        } catch (e) {
            // Non-fatal: tek mağaza hatası diğerlerini ve deploy'u engellemez.
            logger.error(`[StoreConfig Backfill] '${slug}' hata: ${e instanceof Error ? e.message : e}`)
        }
    }
}
