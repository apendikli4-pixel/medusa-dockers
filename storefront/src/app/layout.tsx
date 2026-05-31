import "./globals.css"
import type { Metadata } from "next"
import { ReactNode } from "react"
import { retrieveCurrentTenant } from "@/lib/server/tenant"
import { getSectorTheme, buildThemeStyle } from "@/lib/themes"

export const metadata: Metadata = {
    title: "Ayna Genesis — Yeni Nesil AI Ticaret",
    description: "Yapay zeka destekli, otonom e-ticaret altyapısı.",
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
    // Page title tenant adıyla zenginleştir
    const title = tenant?.name
        ? `${tenant.name} — ${theme.tagline ?? "Ayna Genesis"}`
        : "Ayna Genesis — Yeni Nesil AI Ticaret"

    return (
        <html
            lang="tr"
            className="h-full antialiased"
            data-sector={sectorAttr}
            style={themeStyle}
        >
            <head>
                <title>{title}</title>
                {/* Sektör temalarında kullanılan Google Fonts — system font fallback'i her CSS değişkeninde var */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap"
                />
            </head>
            <body className="min-h-full flex flex-col">
                <main className="flex-grow">{children}</main>
            </body>
        </html>
    )
}
