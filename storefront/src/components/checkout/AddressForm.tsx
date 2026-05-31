"use client"

import { useActionState } from "react"
import { saveAddressAction, type CheckoutFormState } from "@/actions/checkout"

const initial: CheckoutFormState = {}

export type AddressDefaults = {
    email: string
    first_name: string
    last_name: string
    address_1: string
    city: string
    postal_code: string
    phone: string
}

export default function AddressForm({
    countryCode,
    defaults,
}: {
    countryCode: string
    defaults: AddressDefaults
}) {
    const [state, action, pending] = useActionState(saveAddressAction, initial)

    return (
        <form action={action} className="ag-checkout-form">
            <h2 className="ag-checkout-step-title">1. Teslimat Bilgileri</h2>

            <label className="ag-field">
                <span>E-posta *</span>
                <input
                    type="email"
                    name="email"
                    required
                    defaultValue={defaults.email}
                    placeholder="ornek@mail.com"
                    autoComplete="email"
                />
            </label>

            <div className="ag-field-row">
                <label className="ag-field">
                    <span>Ad *</span>
                    <input
                        type="text"
                        name="first_name"
                        required
                        defaultValue={defaults.first_name}
                        autoComplete="given-name"
                    />
                </label>
                <label className="ag-field">
                    <span>Soyad *</span>
                    <input
                        type="text"
                        name="last_name"
                        required
                        defaultValue={defaults.last_name}
                        autoComplete="family-name"
                    />
                </label>
            </div>

            <label className="ag-field">
                <span>Adres *</span>
                <input
                    type="text"
                    name="address_1"
                    required
                    defaultValue={defaults.address_1}
                    placeholder="Mahalle, cadde, no, daire"
                    autoComplete="street-address"
                />
            </label>

            <div className="ag-field-row">
                <label className="ag-field">
                    <span>Şehir *</span>
                    <input
                        type="text"
                        name="city"
                        required
                        defaultValue={defaults.city}
                        autoComplete="address-level2"
                    />
                </label>
                <label className="ag-field">
                    <span>Posta Kodu *</span>
                    <input
                        type="text"
                        name="postal_code"
                        required
                        defaultValue={defaults.postal_code}
                        autoComplete="postal-code"
                    />
                </label>
            </div>

            <label className="ag-field">
                <span>Telefon</span>
                <input
                    type="tel"
                    name="phone"
                    defaultValue={defaults.phone}
                    placeholder="05xx xxx xx xx"
                    autoComplete="tel"
                />
            </label>

            <input type="hidden" name="countryCode" value={countryCode} />

            {state.error && <p className="ag-form-error">{state.error}</p>}

            <div className="ag-checkout-actions">
                <span />
                <button
                    type="submit"
                    disabled={pending}
                    className="ag-btn-primary"
                >
                    {pending ? "Kaydediliyor…" : "Kargoya Devam Et →"}
                </button>
            </div>
        </form>
    )
}
