/**
 * Sektör Tema Sistemi — Ayna Genesis Multi-Tenant Storefront
 *
 * Her sektör için renk paleti, font, layout token'ları.
 * Layout root'unda <html data-sector="..."> attribute'ü ile uygulanır.
 *
 * Tenant'ın settings.theme.primaryColor değeri varsa, sektör temasının
 * primary rengini OVERRIDE eder (her mağaza küçük kişiselleştirme yapabilir).
 *
 * Sektörler (backend src/modules/tenant/service.ts ile birebir):
 *   - retail    : Genel perakende (havuz, ev/yaşam, elektronik) — mavi, temiz
 *   - horeca    : Cafe/restoran/otel — sıcak amber, davetkar
 *   - b2b       : Toptan iş ortakları — koyu lacivert, yoğun veri
 *   - fashion   : Moda/giyim — siyah/beyaz, zarif sans-serif
 */

export type SectorKey = "retail" | "horeca" | "b2b" | "fashion"

export interface SectorTheme {
    /** Tema gösterilen adı (UI'de değil, debug için) */
    label: string
    /** Tema açıklaması */
    description: string
    /** CSS değişkenleri — globals.css'deki --ag-* değerlerini override eder */
    vars: Record<string, string>
    /** Brand badge dolgu rengi */
    brandMark: {
        background: string
        color: string
    }
    /** Tagline (hero altında gözükür) */
    tagline?: string
}

/**
 * Tüm sektör temaları — sektör adı → tema haritası.
 * Bilinmeyen bir sektör gelirse 'retail' fallback olarak kullanılır.
 */
export const SECTOR_THEMES: Record<SectorKey, SectorTheme> = {
    retail: {
        label: "Perakende",
        description: "Genel perakende — temiz, güvenilir mavi",
        vars: {
            "--ag-bg": "#fafafa",
            "--ag-bg-card": "#ffffff",
            "--ag-border": "#e5e7eb",
            "--ag-text": "#111827",
            "--ag-muted": "#6b7280",
            "--ag-primary": "#1e40af",
            "--ag-primary-hover": "#1e3a8a",
            "--ag-accent": "#f59e0b",
            "--ag-radius": "0.5rem",
            "--ag-font-heading": "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
            "--ag-font-body": "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        },
        brandMark: { background: "#1e40af", color: "#ffffff" },
        tagline: "Dürüstlük odaklı e-ticaret",
    },
    horeca: {
        label: "Hotel / Restoran / Cafe",
        description: "Sıcak amber tonları — davetkar, gastronomik",
        vars: {
            "--ag-bg": "#fffaf0",
            "--ag-bg-card": "#ffffff",
            "--ag-border": "#fde68a",
            "--ag-text": "#451a03",
            "--ag-muted": "#a16207",
            "--ag-primary": "#b45309",
            "--ag-primary-hover": "#92400e",
            "--ag-accent": "#dc2626",
            "--ag-radius": "0.75rem",
            "--ag-font-heading": "'Playfair Display', Georgia, 'Times New Roman', serif",
            "--ag-font-body": "Georgia, 'Times New Roman', serif",
        },
        brandMark: { background: "#b45309", color: "#fff7ed" },
        tagline: "Lezzetin adresi — taze ve özenli",
    },
    b2b: {
        label: "B2B / Toptan",
        description: "Koyu lacivert, yoğun veri, kompakt",
        vars: {
            "--ag-bg": "#f1f5f9",
            "--ag-bg-card": "#ffffff",
            "--ag-border": "#cbd5e1",
            "--ag-text": "#0f172a",
            "--ag-muted": "#475569",
            "--ag-primary": "#0f172a",
            "--ag-primary-hover": "#1e293b",
            "--ag-accent": "#0ea5e9",
            "--ag-radius": "0.25rem",
            "--ag-font-heading": "'Inter', system-ui, sans-serif",
            "--ag-font-body": "'Inter', system-ui, sans-serif",
        },
        brandMark: { background: "#0f172a", color: "#ffffff" },
        tagline: "Toptan çözüm ortağınız",
    },
    fashion: {
        label: "Moda / Giyim",
        description: "Siyah-beyaz minimalizm, zarif sans-serif",
        vars: {
            "--ag-bg": "#ffffff",
            "--ag-bg-card": "#ffffff",
            "--ag-border": "#e5e5e5",
            "--ag-text": "#000000",
            "--ag-muted": "#737373",
            "--ag-primary": "#000000",
            "--ag-primary-hover": "#262626",
            "--ag-accent": "#d4af37",
            "--ag-radius": "0",
            "--ag-font-heading": "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
            "--ag-font-body": "'Helvetica Neue', Arial, sans-serif",
        },
        brandMark: { background: "#000000", color: "#ffffff" },
        tagline: "Stilin yeni tanımı",
    },
}

/**
 * Sektör için tema getir (case-insensitive). Bilinmeyen sektör → retail.
 */
export function getSectorTheme(sector: string | null | undefined): SectorTheme {
    const key = (sector || "retail").toLowerCase() as SectorKey
    return SECTOR_THEMES[key] ?? SECTOR_THEMES.retail
}

/**
 * CSS değişkenlerini inline style olarak <html> veya <body>'ye basmak için.
 * Tenant primaryColor varsa onunla override edilir.
 */
export function buildThemeStyle(
    sector: string | null | undefined,
    primaryOverride?: string | null
): React.CSSProperties {
    const theme = getSectorTheme(sector)
    const vars: Record<string, string> = { ...theme.vars }
    if (primaryOverride) {
        vars["--ag-primary"] = primaryOverride
    }
    return vars as React.CSSProperties
}
