/**
 * SectorRulesService — Domain Service
 *
 * Sektörel iş kurallarını sepet öğelerine ve ürün listelerine uygular.
 * Pure functional — DI yok, side-effect yok, tenant + ürün + miktar al,
 * SectorValidationResult döndür.
 *
 * Bu sayede:
 *   - Test edilmesi kolay (mock kurmak gerekmez)
 *   - Hem API route'larından hem workflow step'lerinden çağrılabilir
 *   - Tenant context middleware'i hangi yoldan çağırırsa çağırsın çalışır
 *
 * Stok kontrolü (enforcePhysicalStock) BU servisin işi değildir — stok bilgisi
 * Medusa'nın inventory modülünden gelir. Bu servis stok değerini parametre
 * olarak alır ve yalnızca kural uygulamasını yapar.
 */

import { SectorRegistry } from "./registry"
import type {
    SectorCode,
    SectorValidationResult,
} from "./types"

// ─── INPUT TİPLERİ ─────────────────────────────────────────────────

export interface ValidateCartItemInput {
    /** Tenant'ın sektör kodu (örn: "b2b") */
    sector: SectorCode | string

    /** Sepete eklenmek istenen miktar */
    quantity: number

    /**
     * Ürün metadata'sından okunan MOQ override (varsa).
     * Yoksa tenant veya sektör defaults kullanılır.
     */
    productMoq?: number | null

    /**
     * Tenant settings'ten okunan mağaza-geneli MOQ varsayılanı (varsa).
     */
    tenantDefaultMoq?: number | null

    /**
     * Müşteri tarafından seçilen teslimat/rezervasyon tarihi (varsa).
     * HORECA için zorunlu — yoksa MISSING_DELIVERY_DATE döner.
     */
    requestedDate?: string | Date | null

    /**
     * Ürün B2B-only olarak işaretli mi (product.metadata.b2b_only).
     * RETAIL sektöründe true ise PRODUCT_NOT_AVAILABLE_IN_SECTOR döner.
     */
    isB2BOnly?: boolean

    /**
     * Mevcut fiziksel stok (Medusa inventory modülünden çekilir).
     * undefined verilirse stok kontrolü atlanır — sorumluluk çağıran taraftadır.
     */
    availableStock?: number
}

// ─── ANA SERVİS ────────────────────────────────────────────────────

export class SectorRulesService {
    /**
     * Bir sepet öğesinin sektör kurallarına uygun olup olmadığını döndürür.
     *
     * Kontrol sırası (ilk başarısız olan döner, sonrasına bakmaz):
     *   1. Sektörün desteklenip desteklenmediği
     *   2. Ürün bu sektörde satılabilir mi (showB2BOnlyProducts)
     *   3. Teslimat tarihi gerekli mi ve verilmiş mi (requiresDeliveryDate)
     *   4. MOQ karşılanıyor mu (moqEnabled)
     *   5. Fiziksel stok yeterli mi (enforcePhysicalStock)
     */
    static validateCartItem(input: ValidateCartItemInput): SectorValidationResult {
        if (!SectorRegistry.isSupported(input.sector)) {
            return {
                valid: false,
                violation: "PRODUCT_NOT_AVAILABLE_IN_SECTOR",
                message: `Bu mağazanın sektör yapılandırması (${input.sector}) sistemde tanımlı değil. Lütfen mağaza yöneticisi ile iletişime geçin.`,
                honestyNote: "Tanımsız sektörlerde işlem yapılmasına izin vermiyoruz; bu, müşterilerimizin yanlış kural altında işlem yapmasını engellemek içindir.",
            }
        }

        const config = SectorRegistry.get(input.sector)
        const rules = config.rules

        // 1. B2B-only ürün kontrolü
        if (input.isB2BOnly && rules.showB2BOnlyProducts === false) {
            return {
                valid: false,
                violation: "PRODUCT_NOT_AVAILABLE_IN_SECTOR",
                message: "Bu ürün yalnızca kurumsal (B2B) müşterilerimize satılmaktadır ve perakende mağazamızda görüntülenmemelidir.",
                honestyNote: "Sektörümüze uymayan ürünleri katalogda tutmuyoruz — gördüğünüz bir hataysa bildirin, hemen düzeltelim.",
            }
        }

        // 2. Teslimat tarihi kontrolü
        if (rules.requiresDeliveryDate && !input.requestedDate) {
            return {
                valid: false,
                violation: "MISSING_DELIVERY_DATE",
                message: `${config.displayName} sektöründe sipariş alabilmek için bir teslimat veya rezervasyon tarihi seçmelisiniz.`,
                honestyNote: "Operasyonel planlama gereği (mutfak, masa, oda hazırlığı) tarihsiz sipariş alamıyoruz — bu kuralı tarafsız uyguluyoruz.",
            }
        }

        // 3. MOQ kontrolü
        if (rules.moqEnabled) {
            const moq = this.resolveMoq(input, rules.defaultMoq)
            if (input.quantity < moq) {
                return {
                    valid: false,
                    violation: "MOQ_NOT_MET",
                    message: `Bu ürün için minimum sipariş miktarı ${moq} adettir. Sepetinizdeki ${input.quantity} adet yetersizdir.`,
                    honestyNote: `Toptan satış maliyetlerimizi şeffaf hesaplıyoruz; ${moq} adet altı siparişlerde birim maliyetimiz fiyatımızı aşıyor.`,
                }
            }
        }

        // 4. Fiziksel stok kontrolü
        if (
            rules.enforcePhysicalStock &&
            typeof input.availableStock === "number" &&
            input.quantity > input.availableStock
        ) {
            return {
                valid: false,
                violation: "INSUFFICIENT_PHYSICAL_STOCK",
                message: `Stoğumuzda ${input.availableStock} adet bulunuyor; istediğiniz ${input.quantity} adet karşılanamıyor.`,
                honestyNote: "Sahip olmadığımız stoğu satışa açmıyoruz; bu, teslimat süresi vermediğimiz halde sipariş alıp sonra iptal etme uygulamasına karşı tutumumuzdur.",
            }
        }

        return { valid: true }
    }

    /**
     * Bir ürünün belirli bir sektörde KATALOG'da görünmesi gerekip
     * gerekmediğini söyler. Storefront ürün listeleme akışı kullanır.
     */
    static shouldShowInCatalog(sector: SectorCode | string, isB2BOnly: boolean): boolean {
        if (!SectorRegistry.isSupported(sector)) {
            return false
        }
        const config = SectorRegistry.get(sector)
        if (isB2BOnly && config.rules.showB2BOnlyProducts === false) {
            return false
        }
        return true
    }

    /**
     * MOQ öncelik sırası: product → tenant → sektör default → 1
     */
    private static resolveMoq(
        input: ValidateCartItemInput,
        sectorDefault?: number
    ): number {
        if (typeof input.productMoq === "number" && input.productMoq > 0) {
            return input.productMoq
        }
        if (typeof input.tenantDefaultMoq === "number" && input.tenantDefaultMoq > 0) {
            return input.tenantDefaultMoq
        }
        if (typeof sectorDefault === "number" && sectorDefault > 0) {
            return sectorDefault
        }
        return 1
    }
}
