/**
 * İyzico Ödeme Provider'ı
 * Son Değişiklik: 2026-03-15 — Hardcoded IP düzeltmesi (getClientIp entegrasyonu)
 */
import {
    AbstractPaymentProvider,
    MedusaError
} from "@medusajs/framework/utils"
// @ts-ignore — SDK yeni kuruldu, tip tanımı eksik olabilir
import Iyzipay from "iyzipay"
import { getClientIp } from "../../utils/get-client-ip"
import { minorToMajorString } from "../../lib/money"
import {
    Logger,
    ProviderWebhookPayload,
    WebhookActionResult,
    CapturePaymentInput,
    CapturePaymentOutput,
    AuthorizePaymentInput,
    AuthorizePaymentOutput,
    CancelPaymentInput,
    CancelPaymentOutput,
    InitiatePaymentInput,
    InitiatePaymentOutput,
    DeletePaymentInput,
    DeletePaymentOutput,
    GetPaymentStatusInput,
    GetPaymentStatusOutput,
    RefundPaymentInput,
    RefundPaymentOutput,
    RetrievePaymentInput,
    RetrievePaymentOutput,
    UpdatePaymentInput,
    UpdatePaymentOutput,
} from "@medusajs/framework/types"
import { randomUUID, createHash, timingSafeEqual } from "crypto"

type IyzicoOptions = {
    api_key?: string
    secret_key?: string
    base_url?: string
}

class IyzicoProvider extends AbstractPaymentProvider<IyzicoOptions> {
    static identifier = "iyzico"
    protected logger_: Logger
    protected options_: IyzicoOptions

    constructor(container: any, options: IyzicoOptions) {
        super(container, options)
        this.logger_ = container.logger
        this.options_ = options
    }

    async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
        const { amount, currency_code, context } = input
        const paymentId = `iyzi_${randomUUID()}`

        this.logger_.info(`iyzico: Initiating payment for amount: ${amount} ${currency_code}`)

        if (!this.options_.api_key || !this.options_.secret_key) {
            this.logger_.warn("iyzico: Missing API credentials, returning placeholder.")
            return {
                id: paymentId,
                data: {
                    payment_url: "https://www.iyzico.com/TOKEN_BEKLENIYOR",
                    status: "pending",
                    is_placeholder: true
                }
            }
        }

        try {
            const iyzipay = new Iyzipay({
                apiKey: this.options_.api_key,
                secretKey: this.options_.secret_key,
                uri: this.options_.base_url || "https://sandbox-api.iyzipay.com"
            });

            // Map context variables safely
            const customer = (context as any).customer || {}
            const billing_address = (context as any).billing_address || {}
            const shipping_address = (context as any).shipping_address || {}

            const request = {
                locale: Iyzipay.LOCALE.TR,
                conversationId: paymentId,
                price: minorToMajorString(amount),
                paidPrice: minorToMajorString(amount),
                currency: currency_code.toUpperCase() === "TRY" ? Iyzipay.CURRENCY.TRY : Iyzipay.CURRENCY[currency_code.toUpperCase()] || Iyzipay.CURRENCY.TRY,
                basketId: (context as any).cart_id || `basket_${randomUUID()}`,
                paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
                callbackUrl: process.env.STORE_CORS ? `${process.env.STORE_CORS}/checkout` : "http://localhost:8000/checkout",
                enabledInstallments: [2, 3, 6, 9],
                buyer: {
                    id: customer.id || `anon_${randomUUID()}`,
                    name: customer.first_name || "Müşteri",
                    surname: customer.last_name || "Soyadı",
                    gsmNumber: customer.phone || "+905555555555",
                    email: customer.email || "no-reply@store.com",
                    identityNumber: process.env.IYZICO_TEST_IDENTITY || "12345678901", // Test TC kimlik no
                    lastLoginDate: "2024-01-01 12:00:00",
                    registrationDate: "2024-01-01 12:00:00",
                    registrationAddress: billing_address.address_1 || "Sistem Adresi",
                    ip: getClientIp(context), // Gerçek istemci IP'si header'lardan çekilir
                    city: billing_address.city || "Istanbul",
                    country: billing_address.country_code || "Turkey",
                    zipCode: billing_address.postal_code || "34000"
                },
                shippingAddress: {
                    contactName: `${shipping_address.first_name || 'Alıcı'} ${shipping_address.last_name || ''}`.trim(),
                    city: shipping_address.city || "Istanbul",
                    country: shipping_address.country_code || "Turkey",
                    address: shipping_address.address_1 || "Kargo Adresi",
                    zipCode: shipping_address.postal_code || "34000"
                },
                billingAddress: {
                    contactName: `${billing_address.first_name || 'Fatura'} ${billing_address.last_name || ''}`.trim(),
                    city: billing_address.city || "Istanbul",
                    country: billing_address.country_code || "Turkey",
                    address: billing_address.address_1 || "Fatura Adresi",
                    zipCode: billing_address.postal_code || "34000"
                },
                basketItems: [
                    {
                        id: `item_${randomUUID()}`,
                        name: "Sipariş Ödemesi",
                        category1: "Havuz Ürünleri",
                        category2: "Genel",
                        itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
                        price: minorToMajorString(amount)
                    }
                ]
            };

            this.logger_.info("iyzico: Requesting CheckoutFormInitialize...")

            return new Promise((resolve, reject) => {
                iyzipay.checkoutFormInitialize.create(request, (err: any, result: any) => {
                    if (err) {
                        this.logger_.error(`iyzico: SDK Error: ${err.message || JSON.stringify(err)}`)
                        return reject(err)
                    }

                    if (result.status === "success") {
                        resolve({
                            id: paymentId,
                            data: {
                                payment_url: result.paymentPageUrl,
                                token: result.token,
                                conversationId: paymentId,
                                status: "pending"
                            }
                        })
                    } else {
                        this.logger_.error(`iyzico: API Error: ${result.errorMessage}`)
                        reject(new Error(`Iyzico initialization failed: ${result.errorMessage}`))
                    }
                })
            })

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error"
            this.logger_.error(`iyzico: Fatal error in initiatePayment: ${message}`)
            throw error
        }
    }

    async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
        this.logger_.info(`iyzico: Authorizing payment`)
        // Iyzico'da 3D Secure akışı initiatePayment (checkoutForm) ile başlar.
        // Bu metod genellikle ödeme onaylandığında Medusa tarafından çağrılır.
        return {
            status: "authorized",
            data: { ...input.data, authorized_at: new Date() }
        }
    }

    async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
        this.logger_.info(`iyzico: Capturing payment (PaymentId: ${input.data?.paymentId})`)
        
        if (!this.options_.api_key || !this.options_.secret_key) {
            throw new MedusaError(MedusaError.Types.INVALID_DATA, "Iyzico credentials missing for capture.")
        }

        const iyzipay = new Iyzipay({
            apiKey: this.options_.api_key,
            secretKey: this.options_.secret_key,
            uri: this.options_.base_url || "https://sandbox-api.iyzipay.com"
        })

        const request = {
            locale: Iyzipay.LOCALE.TR,
            conversationId: (input as any).id || randomUUID(),
            paymentId: input.data?.paymentId as string,
            ip: "127.0.0.1", // Admin/sistem operasyonu — müşteri IP'si gerekmez
            price: ((input as any).amount ? minorToMajorString((input as any).amount) : "0")
        }

        return new Promise((resolve, reject) => {
            iyzipay.payment.create(request, (err: any, result: any) => {
                if (err) return reject(err)
                if (result.status === "success") {
                    resolve({ data: { ...input.data, captured_at: new Date(), iyzico_result: result } })
                } else {
                    reject(new Error(`Iyzico capture failed: ${result.errorMessage}`))
                }
            })
        })
    }

    async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
        this.logger_.info(`iyzico: Canceling payment: ${input.data?.paymentId}`)
        
        const iyzipay = new Iyzipay({
            apiKey: this.options_.api_key,
            secretKey: this.options_.secret_key,
            uri: this.options_.base_url || "https://sandbox-api.iyzipay.com"
        })

        const request = {
            locale: Iyzipay.LOCALE.TR,
            conversationId: (input as any).id || randomUUID(),
            paymentId: input.data?.paymentId as string,
            ip: "127.0.0.1" // Admin/sistem operasyonu — müşteri IP'si gerekmez
        }

        return new Promise((resolve, reject) => {
            iyzipay.cancel.create(request, (err: any, result: any) => {
                if (err) return reject(err)
                if (result.status === "success") {
                    resolve({ data: { ...input.data, cancelled_at: new Date() } })
                } else {
                    reject(new Error(`Iyzico cancel failed: ${result.errorMessage}`))
                }
            })
        })
    }

    async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
        return { data: input.data }
    }

    async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
        const status = (input.data?.status as string) || "pending"
        return { status: status as any }
    }

    async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
        this.logger_.info(`iyzico: Refunding payment: ${input.data?.paymentId} / Amount: ${input.amount}`)
        
        const iyzipay = new Iyzipay({
            apiKey: this.options_.api_key,
            secretKey: this.options_.secret_key,
            uri: this.options_.base_url || "https://sandbox-api.iyzipay.com"
        })

        const request = {
            locale: Iyzipay.LOCALE.TR,
            conversationId: input.data?.paymentId as string,
            paymentTransactionId: input.data?.transactionId as string, // İade için transactionId gerekir
            price: minorToMajorString(input.amount),
            ip: "127.0.0.1" // Admin/sistem operasyonu — müşteri IP'si gerekmez
        }

        return new Promise((resolve, reject) => {
            iyzipay.refund.create(request, (err: any, result: any) => {
                if (err) return reject(err)
                if (result.status === "success") {
                    resolve({ data: { ...input.data, refunded_at: new Date(), refund_id: result.refundId } })
                } else {
                    reject(new Error(`Iyzico refund failed: ${result.errorMessage}`))
                }
            })
        })
    }

    async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
        return { data: input.data }
    }

    async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
        return { data: { ...input.data, amount: input.amount } }
    }

    async getWebhookActionAndData(payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
        const body = (payload as any)?.data ?? payload as any

        const paymentId: string = body.paymentId ?? ""
        // paymentStatus alanı yoksa status alanına fallback yap
        const paymentStatus: string = body.paymentStatus ?? body.status ?? ""
        // İmza alanı: iyziReferenceCode veya signature
        const incomingSignature: string = body.iyziReferenceCode ?? body.signature ?? ""

        const secretKey: string = this.options_?.secret_key ?? ""

        // İmza alanı boş veya eksikse reddet
        if (!incomingSignature) {
            this.logger_.warn("İyzico: Invalid webhook signature")
            return { action: "not_supported" }
        }

        // İyzico imza algoritması: SHA1(secret_key + paymentId + paymentStatus) → base64
        const expectedSignature = createHash("sha1")
            .update(secretKey + paymentId + paymentStatus)
            .digest("base64")

        // Timing-safe karşılaştırma için eşit uzunlukta buffer'lar gerekir
        let signaturesMatch = false
        try {
            const incomingBuf = Buffer.from(incomingSignature)
            const expectedBuf = Buffer.from(expectedSignature)
            if (incomingBuf.length === expectedBuf.length) {
                signaturesMatch = timingSafeEqual(incomingBuf, expectedBuf)
            }
        } catch {
            signaturesMatch = false
        }

        if (!signaturesMatch) {
            this.logger_.warn("İyzico: Invalid webhook signature")
            return { action: "not_supported" }
        }

        return {
            action: "authorized",
            data: {
                session_id: paymentId,
                amount: body.price as any
            }
        }
    }
}

export default IyzicoProvider
