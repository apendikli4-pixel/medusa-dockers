"use client"

import { useActionState } from "react"
import { registerAction, type AuthFormState } from "@/actions/customer"

const initialState: AuthFormState = {}

export default function RegisterForm({ countryCode }: { countryCode: string }) {
    const [state, formAction, pending] = useActionState(registerAction, initialState)
    return (
        <form action={formAction} className="ag-auth-form">
            <input type="hidden" name="countryCode" value={countryCode} />
            <div className="ag-field-row">
                <label className="ag-field">
                    <span>Ad</span>
                    <input
                        type="text"
                        name="first_name"
                        required
                        autoComplete="given-name"
                    />
                </label>
                <label className="ag-field">
                    <span>Soyad</span>
                    <input
                        type="text"
                        name="last_name"
                        required
                        autoComplete="family-name"
                    />
                </label>
            </div>
            <label className="ag-field">
                <span>E-posta</span>
                <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="ornek@mail.com"
                />
            </label>
            <label className="ag-field">
                <span>Telefon (opsiyonel)</span>
                <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    placeholder="+90 5xx xxx xx xx"
                />
            </label>
            <label className="ag-field">
                <span>Şifre</span>
                <input
                    type="password"
                    name="password"
                    required
                    autoComplete="new-password"
                    minLength={6}
                    placeholder="En az 6 karakter"
                />
            </label>
            {state.error && <p className="ag-form-error">{state.error}</p>}
            <button
                type="submit"
                disabled={pending}
                className="ag-btn-primary ag-btn-full"
            >
                {pending ? "Hesap oluşturuluyor…" : "Hesap oluştur"}
            </button>
        </form>
    )
}
