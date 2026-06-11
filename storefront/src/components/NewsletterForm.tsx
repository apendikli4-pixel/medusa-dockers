"use client"

import { useState } from "react"
import { Send, Check } from "lucide-react"

/**
 * Footer bülten kayıt formu.
 * Şimdilik client-side onay verir (e-bülten listesi backend'e ileride bağlanabilir).
 */
export default function NewsletterForm() {
    const [email, setEmail] = useState("")
    const [done, setDone] = useState(false)

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !/.+@.+\..+/.test(email)) return
        setDone(true)
        setEmail("")
        setTimeout(() => setDone(false), 4000)
    }

    return (
        <form onSubmit={submit} className="w-full max-w-md">
            <div
                className="flex items-center gap-2 p-1.5 rounded-full backdrop-blur-sm"
                style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                }}
            >
                <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-posta adresiniz"
                    aria-label="E-posta adresiniz"
                    className="flex-1 min-w-0 bg-transparent px-4 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none"
                />
                <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-[1.03] active:scale-95 whitespace-nowrap"
                    style={{ background: "var(--ag-primary, #11a3c9)", color: "#fff" }}
                >
                    {done ? (
                        <>
                            <Check size={16} /> Kaydolundu
                        </>
                    ) : (
                        <>
                            <Send size={16} /> Abone Ol
                        </>
                    )}
                </button>
            </div>
            <p className="mt-2 text-xs text-white/50 px-2">
                {done
                    ? "Teşekkürler! Kampanya ve yeniliklerden ilk siz haberdar olacaksınız."
                    : "Kampanya ve yeni ürünlerden haberdar olun. İstediğiniz an çıkabilirsiniz."}
            </p>
        </form>
    )
}
