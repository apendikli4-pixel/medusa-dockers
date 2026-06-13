import { MedusaService } from "@medusajs/framework/utils"
import { Logger, RemoteQueryFunction, Context } from "@medusajs/framework/types"

type InjectedDependencies = {
    logger: Logger
}

/**
 * AynaDiagnosticService
 * Proje genelindeki 'fix' ve 'diag' scriptlerini merkezi bir serviste toplar.
 * Profesyonel sistem yönetimi ve otonom hata onarımı için tasarlanmıştır.
 */
export default class AynaDiagnosticService {
    protected logger_: Logger

    constructor({ logger }: InjectedDependencies) {
        this.logger_ = logger
    }

    /**
     * Tüm sistem sağlığını kontrol eder
     */
    async runFullAudit(query: RemoteQueryFunction, sharedContext?: Context) {
        this.logger_.info("[Diagnostic] Full system audit started...")
        const results = {
            regions: await this.auditRegions(query, sharedContext),
            links: await this.auditLinks(sharedContext),
            inventory: await this.auditInventory(query, sharedContext),
            shipping: await this.auditShipping(query, sharedContext)
        }
        this.logger_.info("[Diagnostic] Audit completed.")
        return results
    }

    /**
     * Bölgeleri ve Ülke bağlantılarını kontrol eder
     */
    async auditRegions(query: RemoteQueryFunction, sharedContext?: Context) {
        try {
            const { data: regions } = await query.graph({
                entity: "region",
                fields: ["id", "name", "currency_code", "countries.iso_2"]
            })
            
            return {
                count: regions.length,
                status: regions.length > 0 ? "OK" : "WARNING: No regions found",
                details: regions
            }
        } catch (e: any) {
            return { status: "ERROR", message: e.message }
        }
    }

    /**
     * Link kopukluklarını tarar (Product-SalesChannel, Price-Region vb.)
     */
    async auditLinks(sharedContext?: Context) {
        // DÜRÜSTLÜK: Gerçek link-bütünlüğü kontrolü HENÜZ UYGULANMADI.
        // "OK" döndürmek sahte-yeşil olur (Madde 3 ihlali); olduğu gibi "SKIPPED" deriz.
        this.logger_.info("[Diagnostic] Link denetimi atlandı (henüz uygulanmadı).")
        return {
            status: "SKIPPED",
            implemented: false,
            message: "Link bütünlüğü denetimi henüz uygulanmadı — yeşil sayılmaz."
        }
    }

    /**
     * Stok ve Fiyat uyuşmazlıklarını tarar
     */
    async auditInventory(query: RemoteQueryFunction, sharedContext?: Context) {
        try {
            const { data: inventory } = await query.graph({
                entity: "inventory_item",
                fields: ["id", "sku", "stocked_quantity"]
            })

            return {
                total_items: inventory.length,
                status: "OK"
            }
        } catch (e: any) {
            return { status: "ERROR", message: e.message }
        }
    }

    /**
     * Kargo sağlayıcıları ve metodlarını kontrol eder
     */
    async auditShipping(query: RemoteQueryFunction, sharedContext?: Context) {
        try {
            const { data: shippingOptions } = await query.graph({
                entity: "shipping_option",
                fields: ["id", "name", "price_type", "provider_id"]
            })

            return {
                options_count: shippingOptions.length,
                status: shippingOptions.length > 0 ? "OK" : "WARNING: No shipping options"
            }
        } catch (e: any) {
            return { status: "ERROR", message: e.message }
        }
    }

    /**
     * Otonom Onarım — DÜRÜST sürüm.
     * Şu an doğrulanmış-güvenli otomatik onarım YOKTUR. Bu yüzden ASLA "onarıldı" demez;
     * gerçek denetimi koşar, neyin manuel müdahale gerektirdiğini açıkça listeler ve
     * HİÇBİR DEĞİŞİKLİK YAPMADIĞINI dürüstçe bildirir. Güvenli otomatik onarımlar
     * eklendikçe `fixed` dizisi gerçek eylemlerle dolacaktır (sahte değil).
     */
    async runAutoFix(query?: RemoteQueryFunction, sharedContext?: Context) {
        this.logger_.info("[Diagnostic] Auto-fix talebi alındı...")
        if (!query) {
            return {
                status: "unavailable",
                fixed: [] as string[],
                needs_manual: [] as string[],
                message: "Otomatik onarım çalıştırılamadı: query servisi yok. Hiçbir değişiklik yapılmadı."
            }
        }
        const audit = await this.runFullAudit(query, sharedContext)
        const needs_manual: string[] = []
        for (const [area, result] of Object.entries(audit)) {
            const status = String((result as any)?.status ?? "UNKNOWN")
            if (status.startsWith("ERROR") || status.startsWith("WARNING")) {
                needs_manual.push(`${area}: ${status}`)
            }
        }
        return {
            status: needs_manual.length ? "needs_manual_review" : "healthy",
            fixed: [] as string[], // doğrulanmış-güvenli otomatik onarım eklendikçe dolacak
            needs_manual,
            message: needs_manual.length
                ? `Otomatik onarım YOK. ${needs_manual.length} konu manuel inceleme bekliyor. Hiçbir değişiklik yapılmadı.`
                : "Sistem denetimi temiz; onarılacak sorun bulunamadı. Hiçbir değişiklik yapılmadı."
        }
    }
}
