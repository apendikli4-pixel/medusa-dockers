/**
 * Sektör Tema Sistemi — Ayna Genesis Multi-Tenant Storefront
 *
 * Her sektör için renk paleti, font, layout token'ları.
 * Layout root'unda <html data-sector="..."> attribute'ü ile uygulanır.
 *
 * Tenant'ın settings.theme.primaryColor değeri varsa, sektör temasının
 * primary rengini OVERRIDE eder (her mağaza küçük kişiselleştirme yapabilir).
 */

export type SectorKey = "retail" | "horeca" | "b2b" | "fashion" | "electronics" | "vape" | "pool" | "universal" | "villa"

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
    /**
     * Sektör METİN preset'leri — StoreConfig'te değer yoksa devreye girer.
     * Çözümleme: tenant config → bu preset → universal preset → nötr.
     * Mağazaya özel metin (marka adı vb.) BURAYA yazılmaz; o config'in işidir.
     */
    texts?: {
        /** Footer/meta marka açıklaması */
        brandDescription?: string
        /** Vitrin chat karşılaması */
        aiGreeting?: string
        /** 18+ yaş kapısı varsayılanı */
        ageGate?: { enabled: boolean; message?: string }
    }
}

export const SECTOR_THEMES: Record<SectorKey, SectorTheme> = {
    universal: {
        label: "Evrensel / Pazar Yeri",
        description: "Modern, genel kullanım için temiz tasarım",
        vars: {
            "--ag-bg": "#fafafa",
            "--ag-bg-card": "#ffffff",
            "--ag-border": "#e5e7eb",
            "--ag-text": "#111827",
            "--ag-muted": "#6b7280",
            "--ag-primary": "#2563eb",
            "--ag-primary-hover": "#1d4ed8",
            "--ag-accent": "#f59e0b",
            "--ag-radius": "0.75rem",
            "--ag-font-heading": "var(--font-inter), system-ui, sans-serif",
            "--ag-font-body": "var(--font-inter), system-ui, sans-serif",
        },
        brandMark: { background: "#2563eb", color: "#ffffff" },
        tagline: "Aradığınız her şey burada.",
        texts: {
            brandDescription: "Aradığınız ürünler, dürüst fiyatlar ve güvenli alışveriş.",
            aiGreeting: "Merhaba! Ben Ayna. Ürünlerimiz veya siparişleriniz hakkında size nasıl yardımcı olabilirim?",
            ageGate: { enabled: false },
        },
    },
    villa: {
        label: "Villa & Tatil Kiralama",
        description: "Lüks, ferah, sıcak ve davetkar tatil teması",
        vars: {
            "--ag-bg": "#fafaf9",
            "--ag-bg-card": "#ffffff",
            "--ag-border": "#e7e5e4",
            "--ag-text": "#292524",
            "--ag-muted": "#78716c",
            "--ag-primary": "#0d9488",
            "--ag-primary-hover": "#0f766e",
            "--ag-accent": "#f59e0b",
            "--ag-radius": "1rem",
            "--ag-font-heading": "var(--font-playfair), serif",
            "--ag-font-body": "var(--font-inter), sans-serif",
        },
        brandMark: { background: "#0d9488", color: "#ffffff" },
        tagline: "Hayalinizdeki tatil için mükemmel villayı keşfedin.",
    },
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
    pool: {
        label: "Havuz & Su Teknolojileri",
        description: "Ferah aqua ve su mavisi tonları",
        vars: {
            "--ag-bg": "#f0fdfa",
            "--ag-bg-card": "#ffffff",
            "--ag-border": "#ccfbf1",
            "--ag-text": "#115e59",
            "--ag-muted": "#0f766e",
            "--ag-primary": "#0369a1",
            "--ag-primary-hover": "#075985",
            "--ag-accent": "#f59e0b",
            "--ag-radius": "1rem",
            "--ag-font-heading": "var(--font-inter), sans-serif",
            "--ag-font-body": "var(--font-inter), sans-serif",
        },
        brandMark: { background: "#0369a1", color: "#ffffff" },
        tagline: "Havuzunuz için en iyisi.",
        texts: {
            brandDescription: "Havuzunuzun berraklığı için ihtiyacınız olan her şey. Dürüstlük odaklı, yapay zekâ destekli alışveriş deneyimi.",
            aiGreeting: "Merhaba! Ben Ayna. Havuz malzemeleri, bakım tavsiyeleri veya siparişleriniz hakkında size nasıl yardımcı olabilirim?",
            ageGate: { enabled: false },
        },
    },
    vape: {
        label: "Vape & Elektronik Sigara",
        description: "Karanlık, dumanlı, neon vurgular",
        vars: {
            "--ag-bg": "#09090b",
            "--ag-bg-card": "#18181b",
            "--ag-border": "#27272a",
            "--ag-text": "#f4f4f5",
            "--ag-muted": "#a1a1aa",
            "--ag-primary": "#8b5cf6",
            "--ag-primary-hover": "#7c3aed",
            "--ag-accent": "#10b981",
            "--ag-radius": "0.5rem",
            "--ag-font-heading": "var(--font-inter), sans-serif",
            "--ag-font-body": "var(--font-inter), sans-serif",
        },
        brandMark: { background: "#8b5cf6", color: "#ffffff" },
        tagline: "Premium Buhar Deneyimi",
        texts: {
            brandDescription: "Kullan-at elektronik sigara çeşitleri. Orijinal ürün, güvenli ödeme ve hızlı kargo.",
            aiGreeting: "Merhaba! Ben Ayna. Ürünlerimiz veya siparişleriniz hakkında size nasıl yardımcı olabilirim?",
            // Yasal gereklilik: vape sektöründe yaş kapısı varsayılan AÇIK.
            ageGate: {
                enabled: true,
                message: "Bu ürünler nikotin içerir ve yalnızca 18 yaş ve üzeri kişilere yöneliktir.",
            },
        },
    },
    electronics: {
        label: "Elektronik & Teknoloji",
        description: "Siberpunk esintili, keskin, koyu teknolojik tema",
        vars: {
            "--ag-bg": "#020617",
            "--ag-bg-card": "#0f172a",
            "--ag-border": "#1e293b",
            "--ag-text": "#f8fafc",
            "--ag-muted": "#94a3b8",
            "--ag-primary": "#38bdf8",
            "--ag-primary-hover": "#0ea5e9",
            "--ag-accent": "#22d3ee",
            "--ag-on-primary": "#020617",
            "--ag-radius": "0.25rem",
            "--ag-font-heading": "var(--font-inter), sans-serif",
            "--ag-font-body": "var(--font-inter), sans-serif",
        },
        brandMark: { background: "#38bdf8", color: "#020617" },
        tagline: "Geleceğin Teknolojisi",
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
            "--ag-font-heading": "var(--font-playfair), Georgia, serif",
            "--ag-font-body": "Georgia, serif",
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
            "--ag-font-heading": "var(--font-inter), system-ui, sans-serif",
            "--ag-font-body": "var(--font-inter), system-ui, sans-serif",
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
            "--ag-font-heading": "var(--font-cormorant), var(--font-playfair), serif",
            "--ag-font-body": "var(--font-inter), sans-serif",
        },
        brandMark: { background: "#000000", color: "#ffffff" },
        tagline: "Stilin yeni tanımı",
    },
}

/**
 * Sektör için tema getir (case-insensitive). Bilinmeyen sektör → universal.
 */
export function getSectorTheme(sector: string | null | undefined): SectorTheme {
    const key = (sector || "universal").toLowerCase() as SectorKey
    return SECTOR_THEMES[key] ?? SECTOR_THEMES.universal
}

/**
 * Sektör METİN preset'lerini getirir; sektörde tanımsız alanlar universal'a düşer.
 * Kullanım sırası: tenant config → getSectorTexts(sector) → nötr sabit.
 */
export function getSectorTexts(sector: string | null | undefined): NonNullable<SectorTheme["texts"]> {
    const theme = getSectorTheme(sector)
    return { ...SECTOR_THEMES.universal.texts, ...theme.texts }
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
