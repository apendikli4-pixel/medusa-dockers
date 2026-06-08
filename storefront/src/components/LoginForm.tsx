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
        <form action={formAction} className="space-y-6">
            <input type="hidden" name="countryCode" value={countryCode} />
            {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
            
            <div className="space-y-1">
                <label className="block text-sm font-medium text-blue-100">E-posta</label>
                <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="ornek@mail.com"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-blue-200/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/20 transition-all"
                />
            </div>

            <div className="space-y-1">
                <label className="block text-sm font-medium text-blue-100">Şifre</label>
                <input
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-blue-200/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/20 transition-all"
                />
            </div>

            {state.error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg text-sm text-center backdrop-blur-sm">
                    {state.error}
                </div>
            )}

            <button
                type="submit"
                disabled={pending}
                className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl px-4 py-4 mt-2 shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:hover:bg-blue-500 disabled:hover:shadow-lg"
            >
                {pending ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Giriş yapılıyor...
                    </span>
                ) : (
                    "Giriş Yap"
                )}
            </button>
        </form>
    )
}
