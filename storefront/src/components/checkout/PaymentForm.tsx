"use client"

import { useActionState, useState } from "react"
import { selectPaymentAction, type CheckoutFormState } from "@/actions/checkout"

const initial: CheckoutFormState = {}

/**
 * Ödeme yöntemi seçimi.
 *
 * Manual provider (pp_manual_manual) = kapıda ödeme / havale.
 * PayTR & İyzico provider'ları kayıtlı; API anahtarları .env'de tanımlanınca
 * buraya kart ödeme seçeneği olarak eklenebilir. Şimdilik manual aktif.
 */
const METHODS = [
    {
        id: "pp_manual_manual",
        label: "Kapıda Ödeme / Havale",
        sub: "Siparişiniz onaylandıktan sonra ödeme bilgileri iletilir",
    },
]

export default function PaymentForm({ countryCode }: { countryCode: string }) {
    const [state, action, pending] = useActionState(selectPaymentAction, initial)
    const [chosen, setChosen] = useState(METHODS[0].id)

    return (
        <form action={action} className="ag-checkout-form">
            <h2 className="ag-checkout-step-title">3. Ödeme Yöntemi</h2>

            <div className="ag-radio-list">
                {METHODS.map((m) => (
                    <label
                        key={m.id}
                        className={`ag-radio-card ${chosen === m.id ? "selected" : ""}`}
                    >
                        <input
                            type="radio"
                            name="provider_id"
                            value={m.id}
                            checked={chosen === m.id}
                            onChange={() => setChosen(m.id)}
                        />
                        <span className="ag-radio-name">
                            {m.label}
                            <span className="ag-radio-sub">{m.sub}</span>
                        </span>
                    </label>
                ))}
            </div>

            <input type="hidden" name="countryCode" value={countryCode} />

            {state.error && <p className="ag-form-error">{state.error}</p>}

            <div className="ag-checkout-actions">
                <a href={`/${countryCode}/checkout?step=delivery`} className="ag-link">
                    ← Kargo
                </a>
                <button type="submit" disabled={pending} className="ag-btn-primary">
                    {pending ? "Hazırlanıyor…" : "Siparişi İncele →"}
                </button>
            </div>
        </form>
    )
}
