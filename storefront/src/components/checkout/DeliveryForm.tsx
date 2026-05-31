"use client"

import { useActionState, useState } from "react"
import { selectShippingAction, type CheckoutFormState } from "@/actions/checkout"
import { formatPrice } from "@/lib/format"
import type { ShippingOption } from "@/lib/server/checkout"

const initial: CheckoutFormState = {}

export default function DeliveryForm({
    countryCode,
    options,
    currency,
    selectedId,
}: {
    countryCode: string
    options: ShippingOption[]
    currency: string
    selectedId?: string
}) {
    const [state, action, pending] = useActionState(selectShippingAction, initial)
    const [chosen, setChosen] = useState(selectedId || options[0]?.id || "")

    return (
        <form action={action} className="ag-checkout-form">
            <h2 className="ag-checkout-step-title">2. Kargo Yöntemi</h2>

            {options.length === 0 ? (
                <p className="ag-form-error">
                    Bu bölgeye uygun kargo seçeneği bulunamadı. Lütfen adresinizi
                    kontrol edin.
                </p>
            ) : (
                <div className="ag-radio-list">
                    {options.map((o) => (
                        <label
                            key={o.id}
                            className={`ag-radio-card ${chosen === o.id ? "selected" : ""}`}
                        >
                            <input
                                type="radio"
                                name="option_id"
                                value={o.id}
                                checked={chosen === o.id}
                                onChange={() => setChosen(o.id)}
                            />
                            <span className="ag-radio-name">
                                {o.name}
                                <span className="ag-radio-sub">
                                    Tahmini teslimat 1-3 iş günü
                                </span>
                            </span>
                            <span className="ag-radio-price">
                                {o.amount > 0 ? formatPrice(o.amount, currency) : "Ücretsiz"}
                            </span>
                        </label>
                    ))}
                </div>
            )}

            <input type="hidden" name="countryCode" value={countryCode} />

            {state.error && <p className="ag-form-error">{state.error}</p>}

            <div className="ag-checkout-actions">
                <a href={`/${countryCode}/checkout?step=address`} className="ag-link">
                    ← Adres
                </a>
                <button
                    type="submit"
                    disabled={pending || !chosen}
                    className="ag-btn-primary"
                >
                    {pending ? "Kaydediliyor…" : "Ödemeye Devam Et →"}
                </button>
            </div>
        </form>
    )
}
