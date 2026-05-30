"use client"

import { useActionState } from "react"
import { loginAction, type AuthFormState } from "@/actions/customer"

const initialState: AuthFormState = {}

export default function LoginForm({
    countryCode,
    redirectTo,
}: {
    countryCode: string
    redirectTo?: string
}) {
    const [state, formAction, pending] = useActionState(loginAction, initialState)
    return (
        <form action={formAction} className="ag-auth-form">
            <input type="hidden" name="countryCode" value={countryCode} />
            {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
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
                <span>Şifre</span>
                <input
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    minLength={6}
                />
            </label>
            {state.error && <p className="ag-form-error">{state.error}</p>}
            <button
                type="submit"
                disabled={pending}
                className="ag-btn-primary ag-btn-full"
            >
                {pending ? "Giriş yapılıyor…" : "Giriş yap"}
            </button>
        </form>
    )
}
