import "./globals.css"
import type { Metadata, Viewport } from "next"
import { ReactNode } from "react"
import { retrieveCurrentTenant } from "@/lib/server/tenant"
import { getSectorTheme, getSectorTexts, buildThemeStyle } from "@/lib/themes"
import { getBaseUrl } from "@/lib/server/base-url"
import { NEUTRAL_BRAND } from "@/lib/store-config"
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
    const brandName = tenant?.name || NEUTRAL_BRAND
    const description =
        tenant?.storefront?.branding?.description ||
        theme.tagline ||
        "Yapay zeka destekli, otonom e-ticaret altyapısı ve akıllı müşteri deneyimi."
    const title = tenant?.name
        ? `${tenant.name} — ${theme.tagline ?? "Online Mağaza"}`
        : `${NEUTRAL_BRAND} — Online Alışveriş`

    // Anahtar kelimeler mağaza config'inden; yoksa yalnızca nötr + sektör.
    const keywords = [
        "e-ticaret",
        ...(tenant?.storefront?.branding?.keywords || []),
        tenant?.sector || "",
    ].filter(Boolean)

    return {
        title: {
            template: `%s | ${brandName}`,
            default: title,
        },
        description,
        keywords,
        robots: {
            index: true,
            follow: true,
        },
        openGraph: {
            title,
            description,
            siteName: brandName,
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

    // Çoklu mağaza: URL'ler istek host'undan türetilir (hangi mağaza, o domain).
    const baseUrl = await getBaseUrl()
    const brandName = tenant?.name || NEUTRAL_BRAND
    const brandDescription =
        tenant?.storefront?.branding?.description ||
        theme.tagline ||
        "Yapay zeka destekli, otonom e-ticaret altyapısı ve akıllı müşteri deneyimi."
    const contactPhone = tenant?.storefront?.contact?.phone || tenant?.contact?.phone || null
    const logoUrl = tenant?.storefront?.branding?.logoUrl || `${baseUrl}/logo.png`
    const locale = tenant?.storefront?.commerce?.locale || "tr"

    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": brandName,
        "url": baseUrl,
        "logo": logoUrl,
        "description": brandDescription,
        // Telefon yalnızca mağaza config'inde varsa eklenir (sahte numara yasak).
        ...(contactPhone ? {
            "contactPoint": {
                "@type": "ContactPoint",
                "telephone": contactPhone,
                "contactType": "customer service"
            }
        } : {}),
    }

    const websiteSchema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": brandName,
        "url": baseUrl,
        "potentialAction": {
            "@type": "SearchAction",
            "target": `${baseUrl}/${locale}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string"
        }
    }
    
    return (
        <html
            lang="tr"
            className={`h-full antialiased ${inter.variable} ${playfair.variable} ${cormorant.variable}`}
            data-sector={sectorAttr}
            style={themeStyle}
        >
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
                />
            </head>
            <body className="min-h-full flex flex-col bg-gray-50/50">
                <main className="flex-grow relative z-10">{children}</main>
                {/* Chat karşılaması: mağaza config'i → sektör preset'i → nötr (hook içinde). */}
                {/* AI aç/kapa: kapalıysa widget WhatsApp'a yönlendirir (admin'den yönetilir). */}
                <ChatWidget
                    greeting={tenant?.storefront?.ai?.greeting || getSectorTexts(tenant?.sector).aiGreeting}
                    aiChatEnabled={tenant?.storefront?.ai?.chatEnabled !== false}
                    whatsappLink={tenant?.storefront?.ai?.whatsappLink || null}
                />
            </body>
        </html>
    )
}
