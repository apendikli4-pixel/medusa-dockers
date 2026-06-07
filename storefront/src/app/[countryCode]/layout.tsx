import { ReactNode } from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"

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
    return (
        <div className="flex flex-col min-h-screen">
            <Header countryCode={countryCode} />
            <div className="flex-grow">{children}</div>
            <Footer countryCode={countryCode} />
        </div>
    )
}
