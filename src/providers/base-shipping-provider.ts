import { Logger } from "@medusajs/framework/types"
import { AbstractFulfillmentProviderService, MedusaError } from "@medusajs/framework/utils"

/**
 * PROJECT AYNA - GENESIS
 * BaseShippingProvider: Tüm kargo sağlayıcıları için ortak arayüz ve yardımcı metodlar.
 */
export abstract class BaseShippingProvider extends AbstractFulfillmentProviderService {
    protected logger_: Logger

    constructor(container: { logger: Logger }, options?: any) {
        super()
        this.logger_ = container.logger
    }
    
    /**
     * Adres formatı doğrulaması (Pre-check)
     * AI veya kural tabanlı basit kontrol.
     */
    protected validateAddressFormat(address: any): void {
        if (!address.city || !address.address_1) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "Kargo adresi eksik (Şehir ve Adres satırı zorunludur)."
            )
        }
        
        // Örn: Posta kodu kontrolü (TR için 5 hane)
        if (address.country_code?.toLowerCase() === "tr" && address.postal_code && !/^\d{5}$/.test(address.postal_code)) {
            // Sadece uyarı logla veya hata fırlat (şema katılığına bağlı)
            this.logger_.warn(`[ShippingBase] Geçersiz posta kodu formatı: ${address.postal_code}`)
        }
    }

    /**
     * Ortak loglama ve hata yönetimi buraya eklenebilir.
     * Şu an placeholder — concrete provider'lar (yurtici, vs.) kendi
     * trackShipment / cancelShipment metodlarını burada genişletir.
     */
}
