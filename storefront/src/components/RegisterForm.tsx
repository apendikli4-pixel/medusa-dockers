"use client"

import { useActionState } from "react"
import { registerAction, type AuthFormState } from "@/actions/customer"

const initialState: AuthFormState = {}

export default function RegisterForm({ countryCode }: { countryCode: string }) {
    const [state, formAction, pending] = useActionState(registerAction, initialState)
    return (
        <form action={formAction} className="space-y-6">
            <input type="hidden" name="countryCode" value={countryCode} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-indigo-100">Ad</label>
                    <input
                        type="text"
                        name="first_name"
                        required
                        autoComplete="given-name"
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-indigo-200/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/20 transition-all"
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-indigo-100">Soyad</label>
                    <input
                        type="text"
                        name="last_name"
                        required
                        autoComplete="family-name"
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-indigo-200/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/20 transition-all"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="block text-sm font-medium text-indigo-100">E-posta</label>
                <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="ornek@mail.com"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-indigo-200/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/20 transition-all"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-indigo-100">Telefon <span className="opacity-70 text-xs">(opsiyonel)</span></label>
                    <input
                        type="tel"
                        name="phone"
                        autoComplete="tel"
                        placeholder="+90 5xx xxx xx xx"
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-indigo-200/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/20 transition-all"
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-indigo-100">Şifre</label>
                    <input
                        type="password"
                        name="password"
                        required
                        autoComplete="new-password"
                        minLength={6}
                        placeholder="En az 6 karakter"
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-indigo-200/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/20 transition-all"
                    />
                </div>
            </div>

            {state.error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg text-sm text-center backdrop-blur-sm">
                    {state.error}
                </div>
            )}

            <button
                type="submit"
                disabled={pending}
                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl px-4 py-4 mt-2 shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 disabled:opacity-50 disabled:hover:bg-indigo-500 disabled:hover:shadow-lg"
            >
                {pending ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Hesap oluşturuluyor...
                    </span>
                ) : (
                    "Hesap Oluştur"
                )}
            </button>
        </form>
    )
}
