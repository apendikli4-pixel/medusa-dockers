import { ReactNode } from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import AgeGate from "@/components/AgeGate"
import { retrieveCurrentTenant } from "@/lib/server/tenant"

// Tüm storefront sayfaları çalışma anında (SSR) render edilir; build sırasında
// backend'e gidilmez. Bu sayede `next build` backend ayakta olmadan da geçer
// ve production modunda (`next start`) hızlı/stabil çalışır (next dev kaldırıldı).
export const dynamic = "force-dynamic"

export default async function CountryLayout({
    children,
    params,
}: {
    children: ReactNode
    params: Promise<{ countryCode: string }>
}) {
    const { countryCode } = await params
    const tenant = await retrieveCurrentTenant()
    // Vape/elektronik sigara mağazasında 18+ yaş kapısı (yasal/etik gereklilik).
    const needsAgeGate = tenant?.sector === "vape" || (tenant?.features || []).includes("age_gate")
    return (
        <div className="flex flex-col min-h-screen">
            {needsAgeGate && <AgeGate brandName={tenant?.name || "Vozol"} />}
            <Header countryCode={countryCode} />
            <div className="flex-grow">{children}</div>
            <Footer countryCode={countryCode} />
        </div>
    )
}
