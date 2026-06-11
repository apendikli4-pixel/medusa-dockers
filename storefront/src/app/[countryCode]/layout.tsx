import { ReactNode } from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import AgeGate from "@/components/AgeGate"
import { retrieveCurrentTenant } from "@/lib/server/tenant"
import { getSectorTexts } from "@/lib/themes"
import { NEUTRAL_BRAND } from "@/lib/store-config"

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
    // 18+ yaş kapısı CONFIG-DRIVEN: mağaza config'i → sektör preset'i → feature bayrağı.
    // Sektör adı hardcode edilmez; yeni 18+ sektör (örn. alkol) kod değişikliği istemez.
    const texts = getSectorTexts(tenant?.sector)
    const gateCfg = tenant?.storefront?.ageGate
    const needsAgeGate =
        gateCfg?.enabled ??
        texts.ageGate?.enabled ??
        (tenant?.features || []).includes("age_gate")
    const gateMessage = gateCfg?.message || texts.ageGate?.message
    return (
        <div className="flex flex-col min-h-screen">
            {needsAgeGate && <AgeGate brandName={tenant?.name || NEUTRAL_BRAND} message={gateMessage} />}
            <Header countryCode={countryCode} />
            <div className="flex-grow">{children}</div>
            <Footer countryCode={countryCode} />
        </div>
    )
}
