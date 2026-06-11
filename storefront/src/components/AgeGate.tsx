"use client"

import { useEffect, useState } from "react"

/**
 * 18+ Yaş Kapısı — yalnızca vape/elektronik sigara mağazasında gösterilir.
 * Kullanıcı onayı localStorage'da saklanır; onaylanana kadar site içeriği bloke edilir.
 * Yasal/etik gereklilik: nikotin içeren ürünler 18 yaş ve üzeri içindir.
 */
export default function AgeGate({ brandName = "Mağaza" }: { brandName?: string }) {
    const [decided, setDecided] = useState<boolean>(true) // SSR'da gösterme; client'ta karar ver
    const [rejected, setRejected] = useState(false)

    useEffect(() => {
        try {
            const ok = localStorage.getItem("age_verified_18") === "yes"
            setDecided(ok)
        } catch {
            setDecided(false)
        }
    }, [])

    if (decided) return null

    const accept = () => {
        try { localStorage.setItem("age_verified_18", "yes") } catch {}
        setDecided(true)
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            style={{ position: "fixed", inset: 0, zIndex: 9999 }}
            className="flex items-center justify-center p-4"
        >
            <div className="absolute inset-0" style={{ background: "rgba(7,10,20,0.92)", backdropFilter: "blur(6px)" }} />
            <div
                className="relative w-full max-w-md rounded-3xl p-8 text-center shadow-2xl"
                style={{ background: "linear-gradient(180deg,#1b1030,#0d0820)", border: "1px solid rgba(168,85,247,0.35)" }}
            >
                <div
                    className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl text-2xl font-extrabold text-white"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#0ea5e9)" }}
                >
                    18+
                </div>
                <h2 className="mb-2 text-2xl font-bold text-white">Yaş Doğrulaması</h2>
                <p className="mb-1 text-white/70">
                    <strong className="text-white">{brandName}</strong> elektronik sigara ürünleri satmaktadır.
                </p>
                <p className="mb-6 text-white/70">
                    Bu ürünler nikotin içerir ve yalnızca <strong className="text-white">18 yaş ve üzeri</strong> kişilere yöneliktir. 18 yaşından büyük müsünüz?
                </p>

                {rejected ? (
                    <div className="rounded-xl px-4 py-4 text-sm text-white/80" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
                        Üzgünüz, bu siteye erişmek için 18 yaşından büyük olmalısınız.
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                            onClick={accept}
                            className="flex-1 rounded-xl px-5 py-3 font-semibold text-white transition-transform hover:scale-[1.02]"
                            style={{ background: "linear-gradient(135deg,#7c3aed,#0ea5e9)" }}
                        >
                            Evet, 18 yaşından büyüğüm
                        </button>
                        <button
                            onClick={() => setRejected(true)}
                            className="flex-1 rounded-xl px-5 py-3 font-semibold text-white/80 transition-colors hover:text-white"
                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)" }}
                        >
                            Hayır
                        </button>
                    </div>
                )}

                <p className="mt-5 text-xs text-white/40">Nikotin bağımlılık yapar. Sağlığa zararlıdır.</p>
            </div>
        </div>
    )
}
