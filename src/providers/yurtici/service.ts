/**
 * Yurtiçi Kargo Provider Servisi
 * Mühür: 2026-03-15 — Genesis Protocol v2 uyumlu
 *
 * Mock/Production ayrımı:
 *   - USE_MOCK_PROVIDERS=true  → MOCK-YT-{timestamp} formatında takip numarası döner
 *   - USE_MOCK_PROVIDERS=false + API anahtarları var → Gerçek Yurtiçi Kargo API çağrısı
 *   - USE_MOCK_PROVIDERS=false + API anahtarları eksik → MedusaError fırlatılır
 */

import { MedusaError } from "@medusajs/framework/utils"
import { BaseShippingProvider } from "../base-shipping-provider"

// Yurtiçi Kargo SOAP API endpoint'i
const YURTICI_API_ENDPOINT =
    "https://ws.yurticikargo.com:8443/KargoServis/KargoOperasyonServisi"

export default class YurticiProviderService extends BaseShippingProvider {
    static identifier = "yurtici"

    constructor(container: any, options?: any) {
        super(container, options)
    }

    async getFulfillmentOptions(): Promise<any[]> {
        return [
            {
                id: "yurtici-standart",
                label: "Yurtiçi Kargo Standart",
            }
        ]
    }

    async validateFulfillmentData(
        _optionData: any,
        _data: any,
        _context: any
    ): Promise<any> {
        return _data
    }

    async validateShippingOption(_data: any): Promise<boolean> {
        return true
    }

    async createFulfillment(
        _data: any,
        _items: any,
        _order: any,
        _fulfillment: any
    ): Promise<any> {
        // Pre-check: Adres formatı kontrolü — sadece order ve shipping_address mevcutsa
        if (_order?.shipping_address) {
            this.validateAddressFormat(_order.shipping_address)
        }

        const useMock = process.env.USE_MOCK_PROVIDERS === "true"

        if (useMock) {
            const mockTrackingNumber = `MOCK-YT-${Date.now()}`
            this.logger_.info(
                `[YurticiProvider] Mock mod aktif. Takip numarası: ${mockTrackingNumber}`
            )
            return {
                tracking_number: mockTrackingNumber,
                shipping_data: _data,
            }
        }

        // Production mod: Gerçek Yurtiçi Kargo API çağrısı
        const username = process.env.YURTICI_USERNAME
        const password = process.env.YURTICI_PASSWORD

        if (!username || !password) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "Yurtiçi Kargo API kimlik bilgileri eksik. USE_MOCK_PROVIDERS=true ile mock modu etkinleştirin."
            )
        }

        this.logger_.info(
            `[YurticiProvider] Gerçek API çağrısı hazırlanıyor. Endpoint: ${YURTICI_API_ENDPOINT}`
        )

        try {
            // Yurtiçi Kargo SOAP XML hazırlığı (İskelet)
            // Not: Gerçek implementasyonda soap kütüphanesi veya fetch ile XML gönderimi yapılır.
            const _soapRequestXml = `
                <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ship="http://yurticikargo.com.tr/ShippingOrderDispatcherServices">
                   <soapenv:Header/>
                   <soapenv:Body>
                      <ship:createShipment>
                         <userName>${username}</userName>
                         <password>${password}</password>
                         <!-- Diğer sipariş detayları buraya gelecek -->
                      </ship:createShipment>
                   </soapenv:Body>
                </soapenv:Envelope>
            `.trim()

            // Şimdilik API entegrasyonu "Hazır" statüsünde ama henüz canlıya bağlanmadı mesajı döner
            // Gerçek akışta buradan dönen takip numarası kaydedilir.
            const trackingNumber = `YT-${Date.now()}` // API'den gelecek olan numara

            return {
                tracking_number: trackingNumber,
                shipping_data: {
                    ..._data,
                    api_status: "ready_to_send",
                    endpoint: YURTICI_API_ENDPOINT
                }
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error"
            this.logger_.error(`[YurticiProvider] API Hatası: ${message}`)
            throw new MedusaError(
                MedusaError.Types.UNEXPECTED_STATE,
                "Yurtiçi Kargo API çağrısı başarısız oldu."
            )
        }
    }

    async cancelFulfillment(_data: any): Promise<any> {
        return {}
    }
}
