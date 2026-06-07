"use client"

import { useState } from "react"
import { Truck, Search } from "lucide-react"

/**
 * Footer "Kargo Takip" mini-formu.
 * Müşteri kargo firmasını seçer + takip no girer → ilgili firmanın
 * takip sayfasını yeni sekmede açar. (Backend/entegrasyon gerektirmez.)
 */
const CARRIERS: { id: string; label: string; url: (no: string) => string }[] = [
    { id: "yurtici", label: "Yurtiçi Kargo", url: (n) => `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${encodeURIComponent(n)}` },
    { id: "aras", label: "Aras Kargo", url: (n) => `https://kargotakip.araskargo.com.tr/?code=${encodeURIComponent(n)}` },
    { id: "mng", label: "MNG Kargo", url: (n) => `https://kargotakip.mngkargo.com.tr/?takipNo=${encodeURIComponent(n)}` },
    { id: "ptt", label: "PTT Kargo", url: (n) => `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${encodeURIComponent(n)}` },
    { id: "surat", label: "Sürat Kargo", url: (n) => `https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=${encodeURIComponent(n)}` },
]

export default function CargoTracking() {
    const [carrier, setCarrier] = useState("yurtici")
    const [code, setCode] = useState("")

    const track = (e: React.FormEvent) => {
        e.preventDefault()
        if (!code.trim()) return
        const c = CARRIERS.find((x) => x.id === carrier) || CARRIERS[0]
        window.open(c.url(code.trim()), "_blank", "noopener,noreferrer")
    }

    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <Truck size={18} style={{ color: "var(--ag-primary, #36c5e6)" }} />
                <h3 className="text-lg font-semibold">Kargo Takip</h3>
            </div>
            <form onSubmit={track} className="flex flex-col sm:flex-row gap-2">
                <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    aria-label="Kargo firması"
                    className="rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}
                >
                    {CARRIERS.map((c) => (
                        <option key={c.id} value={c.id} style={{ color: "#0a1a24" }}>{c.label}</option>
                    ))}
                </select>
                <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Takip numaranız"
                    aria-label="Takip numarası"
                    className="flex-1 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}
                />
                <button
                    type="submit"
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 hover:scale-[1.02] whitespace-nowrap"
                    style={{ background: "var(--ag-primary, #11a3c9)", color: "#fff" }}
                >
                    <Search size={16} /> Takip Et
                </button>
            </form>
            <p className="mt-2 text-xs text-white/45">Kargo firmasını seçip takip numaranızı girin; firmanın takip sayfası açılır.</p>
        </div>
    )
}
