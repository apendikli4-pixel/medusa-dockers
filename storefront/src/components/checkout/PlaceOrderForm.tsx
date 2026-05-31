"use client"

import { useActionState } from "react"
import { placeOrderAction, type CheckoutFormState } from "@/actions/checkout"

const initial: CheckoutFormState = {}

export default function PlaceOrderForm({ countryCode }: { countryCode: string }) {
    const [state, action, pending] = useActionState(placeOrderAction, initial)

    return (
        <form action={action}>
            <input type="hidden" name="countryCode" value={countryCode} />
            {state.error && <p className="ag-form-error">{state.error}</p>}
            <button
                type="submit"
                disabled={pending}
                className="ag-btn-primary ag-btn-full ag-btn-lg"
            >
                {pending ? "Sipariş oluşturuluyor…" : "Siparişi Onayla"}
            </button>
            <p className="ag-checkout-note" style={{ marginTop: "0.75rem" }}>
                Onayla'ya bastığınızda siparişiniz oluşturulur.
            </p>
        </form>
    )
}
