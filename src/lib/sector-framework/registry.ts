/**
 * Sector Registry — Strategy Pattern Implementation
 *
 * Sektör yapılandırmalarını merkezi bir kayıt defterinde tutar. Her sektör
 * dosyası (sectors/retail.ts vb.) import edildiğinde kendini buraya kaydeder.
 *
 * Kullanım:
 *   import "./sectors"            // tüm sektörleri yükle (side-effect import)
 *   SectorRegistry.get("retail")  // konfigürasyonu al
 *
 * Tasarım kararları:
 *   - Static class kullanılır (singleton değil) — test sırasında reset() ile
 *     temizlenebilir, mock sektör kayıtları yapılabilir.
 *   - Sektör kodları case-insensitive normalize edilir ama internal storage
 *     küçük harftir (Tenant.sector ile birebir eşleşir).
 *   - Çift kayıt YASAKTIR — register() ikinci kez aynı kod için çağrılırsa
 *     hata atar, çünkü bu büyük olasılıkla bir mimari hatadır.
 */

import type { SectorCode, SectorConfig } from "./types"

export class SectorRegistry {
    private static readonly sectors = new Map<SectorCode, SectorConfig>()

    /**
     * Yeni bir sektörü kayıt defterine ekler.
     *
     * @throws Error — aynı kod için ikinci kez çağrılırsa
     */
    static register(config: SectorConfig): void {
        const code = config.code
        if (this.sectors.has(code)) {
            throw new Error(
                `[SectorRegistry] '${code}' sektörü zaten kayıtlı. ` +
                "Bir sektör birden fazla yerde register edilemez."
            )
        }
        this.sectors.set(code, config)
    }

    /**
     * Verilen koda ait sektör konfigürasyonunu döndürür.
     *
     * @throws Error — kod kayıtlı değilse
     */
    static get(code: string): SectorConfig {
        const normalized = code.toLowerCase() as SectorCode
        const config = this.sectors.get(normalized)
        if (!config) {
            throw new Error(
                `[SectorRegistry] '${code}' sektörü kayıtlı değil. ` +
                `Kayıtlı sektörler: ${this.listCodes().join(", ") || "(hiç)"}`
            )
        }
        return config
    }

    /**
     * Sektörün desteklenip desteklenmediğini söyler — exception atmaz.
     * Tenant create akışında validasyon için kullanılır.
     */
    static isSupported(code: string): boolean {
        return this.sectors.has(code.toLowerCase() as SectorCode)
    }

    /**
     * Tüm kayıtlı sektörlerin konfigürasyonlarını döndürür.
     * Admin panelinde sektör listesi göstermek için kullanılır.
     */
    static list(): SectorConfig[] {
        return Array.from(this.sectors.values())
    }

    /**
     * Tüm kayıtlı sektör kodlarını döndürür.
     */
    static listCodes(): SectorCode[] {
        return Array.from(this.sectors.keys())
    }

    /**
     * Kayıt defterini sıfırlar.
     *
     * SADECE test ortamında kullanılır — production'da çağrılırsa
     * sonraki request'lerde "sektör kayıtlı değil" hatası alınır.
     */
    static reset(): void {
        this.sectors.clear()
    }
}
