import "./globals.css"
import type { Metadata, Viewport } from "next"
import { ReactNode } from "react"
import { retrieveCurrentTenant } from "@/lib/server/tenant"
import { getSectorTheme, buildThemeStyle } from "@/lib/themes"
import ChatWidget from "@/modules/chat/components/chat-widget"
import { Inter, Playfair_Display, Cormorant_Garamond } from "next/font/google"

// Production build (next start) için: build sırasında backend'e gidilmesin diye
// tüm uygulama çalışma anında (SSR) render edilir.
export const dynamic = "force-dynamic"

const inter = Inter({
    subsets: ["latin", "latin-ext"],
    variable: "--font-inter",
    display: "swap",
})

const playfair = Playfair_Display({
    subsets: ["latin", "latin-ext"],
    variable: "--font-playfair",
    display: "swap",
})

const cormorant = Cormorant_Garamond({
    subsets: ["latin", "latin-ext"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-cormorant",
    display: "swap",
})

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
}

export async function generateMetadata(): Promise<Metadata> {
    const tenant = await retrieveCurrentTenant()
    const theme = getSectorTheme(tenant?.sector)
    const title = tenant?.name
        ? `${tenant.name} — ${theme.tagline ?? "Ayna Genesis"}`
        : "Ayna Genesis — Yeni Nesil AI Ticaret"

    return {
        title: {
            template: `%s | ${tenant?.name || "Ayna Genesis"}`,
            default: title,
        },
        description: theme.tagline || "Yapay zeka destekli, otonom e-ticaret altyapısı ve akıllı müşteri deneyimi.",
        keywords: ["e-ticaret", "yapay zeka", "otonom ticaret", "Ayna AI", "havuz malzemeleri", tenant?.sector || ""],
        robots: {
            index: true,
            follow: true,
        },
        openGraph: {
            title,
            description: theme.tagline || "Yapay zeka destekli, otonom e-ticaret altyapısı.",
            siteName: tenant?.name || "Ayna Genesis",
            type: "website"
        }
    }
}

/**
 * Root layout — async; mevcut tenant'ı çözer ve sektör temasını uygular.
 *
 * <html data-sector="..."> ile CSS overrides aktive olur,
 * inline style ile CSS değişkenleri set edilir (her render fresh).
 *
 * Fontlar: Google Fonts üzerinden lazy yüklenir; system font fallback'leri
 * her temada CSS değişkenlerinde tanımlı (offline çalışmaya devam eder).
 */
export default async function RootLayout({
    children,
}: {
    children: ReactNode
}) {
    const tenant = await retrieveCurrentTenant()
    const theme = getSectorTheme(tenant?.sector)
    const themeStyle = buildThemeStyle(
        tenant?.sector,
        tenant?.theme?.primaryColor ?? null
    )
    const sectorAttr = (tenant?.sector || "retail").toLowerCase()
    
    return (
        <html
            lang="tr"
            className={`h-full antialiased ${inter.variable} ${playfair.variable} ${cormorant.variable}`}
            data-sector={sectorAttr}
            style={themeStyle}
        >
            <head>
                {/* SEO Metadata is injected automatically by Next.js App Router */}
            </head>
            <body className="min-h-full flex flex-col bg-gray-50/50">
                <main className="flex-grow relative z-10">{children}</main>
                <ChatWidget />
            </body>
        </html>
    )
}
