
import { AbstractPaymentProvider, MedusaError } from "@medusajs/framework/utils"
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

type Options = {}

type InjectedDependencies = {
    logger: Logger
}

type PaymentSessionStatus = "authorized" | "captured" | "pending" | "canceled" | "requires_more" | "error"

class ManualPaymentProvider extends AbstractPaymentProvider<Options> {
    static identifier = "manual"
    protected logger_: Logger

    constructor(container: InjectedDependencies, options: Options) {
        super(container, options)
        this.logger_ = container.logger || console as unknown as Logger
    }

    static validateOptions(options: Record<any, any>) { }

    async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
        const sessionId = `manual_${randomUUID()}`
        this.logger_.info(`Manual payment initiated with session ID: ${sessionId}`)
        return {
            id: sessionId,
            data: {
                status: "pending",
                amount: input.amount,
                currency_code: input.currency_code
            },
        }
    }

    async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
        return {
            status: "authorized",
            data: { ...input.data, status: "authorized" },
        }
    }

    async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
        return {
            data: { ...input.data, status: "captured" },
        }
    }

    async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
        return {
            data: { ...input.data, status: "canceled" },
        }
    }

    async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
        return { data: input.data }
    }

    async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
        const status = (input.data?.status as string) || "pending"
        return { status: status as PaymentSessionStatus }
    }

    async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
        return {
            data: { ...input.data, status: "refunded" },
        }
    }

    async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
        return { data: input.data }
    }

    async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
        return {
            data: { ...input.data, amount: input.amount },
        }
    }

    async getWebhookActionAndData(payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult> {
        return {
            action: "not_supported",
            data: { session_id: "", amount: 0 as any },
        }
    }
}

export default ManualPaymentProvider
