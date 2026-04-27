
/**
 * PayTR Ödeme Provider'ı
 * Son Değişiklik: 2026-03-15 — Hardcoded IP düzeltmesi (getClientIp entegrasyonu)
 */
import {
    AbstractPaymentProvider,
} from "@medusajs/framework/utils"
import crypto from "crypto"
import { getClientIp } from "../../utils/get-client-ip"
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
import { randomUUID } from "crypto"

type PayTROptions = {
    merchant_id?: string
    merchant_key?: string
    merchant_salt?: string
    debug?: boolean
}

class PayTRProvider extends AbstractPaymentProvider<PayTROptions> {
    static identifier = "paytr"
    protected logger_: Logger
    protected options_: PayTROptions

    constructor(container: any, options: PayTROptions) {
        super(container, options)
        this.logger_ = container.logger
        this.options_ = options
    }

    async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
        const { amount, currency_code, context } = input
        const merchant_oid = `paytr_${randomUUID()}`

        this.logger_.info(`PayTR: Initiating payment for amount: ${amount} ${currency_code}`)

        // If credentials are missing, return placeholder
        if (!this.options_.merchant_id || !this.options_.merchant_key || !this.options_.merchant_salt) {
            this.logger_.warn("PayTR: Missing credentials, returning placeholder.")
            return {
                id: merchant_oid,
                data: {
                    payment_url: "https://www.paytr.com/odeme/guvenli/TOKEN_BEKLENIYOR",
                    status: "pending",
                    is_placeholder: true
                }
            }
        }

        try {
            // Context mapping
            const customer = (context as any).customer || {}
            const user_ip = getClientIp(context)
            const user_name = customer.first_name ? `${customer.first_name} ${customer.last_name || ''}`.trim() : "Musteri"
            const user_address = "Sistem Adresi" // Fallback
            const user_phone = customer.phone || "05555555555"
            const user_email = customer.email || "no-reply@aquahavuz.com"

            // Medusa amounts are already expected in minor units (e.g. kurus).
            const normalizedAmount = Number(amount)
            if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
                throw new Error("PayTR: Invalid payment amount")
            }
            const payment_amount = Math.round(normalizedAmount)

            // Build simple basket
            const user_basket = Buffer.from(JSON.stringify([
                ["Siparis Odemesi", (payment_amount / 100).toString(), 1]
            ])).toString("base64")

            const timeout_limit = "30"
            const debug_on = this.options_.debug ? "1" : "0"
            const test_mode = this.options_.debug ? "1" : "0"
            const no_installment = "0"
            const max_installment = "0"
            const currency = currency_code.toUpperCase() === "TRY" ? "TL" : currency_code.toUpperCase()
            const merchant_ok_url = process.env.STORE_CORS ? `${process.env.STORE_CORS}/checkout` : "http://localhost:8000/checkout"
            const merchant_fail_url = process.env.STORE_CORS ? `${process.env.STORE_CORS}/checkout?error=true` : "http://localhost:8000/checkout?error=true"

            // Construct Hash String
            const hash_str = `${this.options_.merchant_id}${user_ip}${merchant_oid}${user_email}${payment_amount}${user_basket}${no_installment}${max_installment}${currency}${test_mode}`
            const paytr_token = crypto.createHmac('sha256', this.options_.merchant_key)
                .update(hash_str + this.options_.merchant_salt)
                .digest('base64')

            const formData = new URLSearchParams()
            formData.append('merchant_id', this.options_.merchant_id)
            formData.append('user_ip', user_ip)
            formData.append('merchant_oid', merchant_oid)
            formData.append('email', user_email)
            formData.append('payment_amount', payment_amount.toString())
            formData.append('paytr_token', paytr_token)
            formData.append('user_basket', user_basket)
            formData.append('debug_on', debug_on)
            formData.append('no_installment', no_installment)
            formData.append('max_installment', max_installment)
            formData.append('user_name', user_name)
            formData.append('user_address', user_address)
            formData.append('user_phone', user_phone)
            formData.append('merchant_ok_url', merchant_ok_url)
            formData.append('merchant_fail_url', merchant_fail_url)
            formData.append('timeout_limit', timeout_limit)
            formData.append('currency', currency)
            formData.append('test_mode', test_mode)

            this.logger_.info("PayTR: Requesting token...")

            const response = await fetch("https://www.paytr.com/odeme/api/get-token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: formData.toString()
            })

            const result = await response.json()

            if (result.status === "success") {
                return {
                    id: merchant_oid,
                    data: {
                        payment_url: `https://www.paytr.com/odeme/guvenli/${result.token}`,
                        token: result.token,
                        merchant_oid,
                        status: "pending"
                    }
                }
            } else {
                this.logger_.error(`PayTR: API Error: ${result.reason}`)
                throw new Error(`PayTR Token Error: ${result.reason}`)
            }

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error"
            this.logger_.error(`PayTR: Fatal error in initiatePayment: ${message}`)
            throw error
        }
    }

    async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
        return {
            status: "authorized",
            data: { ...input.data, authorized_at: new Date() }
        }
    }

    async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
        return { data: { ...input.data, captured_at: new Date() } }
    }

    async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
        return { data: { ...input.data, canceled_at: new Date() } }
    }

    async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
        return { data: input.data }
    }

    async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
        const status = (input.data?.status as string) || "pending"
        return { status: status as any }
    }

    async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
        return { data: { ...input.data, refunded_at: new Date() } }
    }

    async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
        return { data: input.data }
    }

    async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
        return { data: { ...input.data, amount: input.amount } }
    }

    async getWebhookActionAndData(payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
        const body = (payload as any).data ?? payload as any

        const merchant_key = this.options_.merchant_key ?? ""
        const merchant_salt = this.options_.merchant_salt ?? ""
        const merchant_oid: string = body.merchant_oid ?? ""
        const status: string = body.status ?? ""
        const incomingHash: string = body.hash ?? ""

        // Reject immediately if hash is missing or empty
        if (!incomingHash) {
            this.logger_.warn("PayTR: Invalid webhook signature — possible attack")
            return { action: "not_supported" }
        }

        // Compute expected HMAC-SHA256 hash
        const hash_str = merchant_key + merchant_salt + merchant_oid + status
        const expected_hash = crypto
            .createHmac("sha256", merchant_salt)
            .update(hash_str)
            .digest("base64")

        // Timing-safe comparison — guard against different-length buffers
        let isValid = false
        try {
            const incomingBuf = Buffer.from(incomingHash)
            const expectedBuf = Buffer.from(expected_hash)
            if (incomingBuf.length === expectedBuf.length) {
                isValid = crypto.timingSafeEqual(incomingBuf, expectedBuf)
            }
        } catch {
            isValid = false
        }

        if (!isValid) {
            this.logger_.warn("PayTR: Invalid webhook signature — possible attack")
            return { action: "not_supported" }
        }

        return {
            action: "authorized",
            data: {
                session_id: body.merchant_oid as string,
                amount: body.total_amount as any
            }
        }
    }
}

export default PayTRProvider
