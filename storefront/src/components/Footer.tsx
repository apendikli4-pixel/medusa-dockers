import Link from "next/link"
import {
    ShieldCheck, Truck, RotateCcw, Headphones,
    Phone, Mail, MapPin, User,
    Waves, ChevronRight, CreditCard, Lock,
} from "lucide-react"
import NewsletterForm from "./NewsletterForm"
import CargoTracking from "./CargoTracking"

// Marka logoları lucide-react'in bu sürümünde yok → inline SVG (24x24).
const IgIcon = (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
        <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
)
const FbIcon = (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className={p.className}>
        <path d="M14 9h3l.5-3H14V4.5c0-.8.3-1.5 1.5-1.5H17V.2C16.6.1 15.5 0 14.4 0 11.9 0 10 1.5 10 4.3V6H7v3h3v9h4V9z" />
    </svg>
)
const XIcon = (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className={p.className}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
)
const YtIcon = (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className={p.className}>
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.5 15.5v-7l6.5 3.5z" />
    </svg>
)

import { retrieveCurrentTenant } from "../lib/server/tenant"

/**
 * Aqua Havuz / Dinamik Tenant Footer'ı
 */
export default async function Footer({ countryCode }: { countryCode: string }) {
    const base = `/${countryCode}`
    const year = new Date().getFullYear()

    // Tenant bilgisini çek (yoksa null döner, fallback kullanırız)
    const tenant = await retrieveCurrentTenant()
    const sf = tenant?.storefront || {}

    const parseLinks = (str?: string, defaultLinks: {label:string, href:string}[] = []) => {
        if (!str || !str.trim()) return defaultLinks
        return str.split('\n').filter(Boolean).map(l => {
            const [label, href] = l.split('|')
            return { label: label?.trim(), href: href?.trim() || '#' }
        }).filter(l => l.label)
    }

    const trust = [
        { icon: ShieldCheck, title: "Güvenli Alışveriş", desc: "256-bit SSL koruması" },
        { icon: Truck, title: "Hızlı Kargo", desc: "Aynı gün kargo imkânı" },
        { icon: RotateCcw, title: "Kolay İade", desc: "14 gün içinde iade" },
        { icon: Headphones, title: "AI Destek", desc: "7/24 Ayna asistan" },
    ]

    const columns = [
        {
            title: "Kurumsal",
            links: parseLinks(sf.links?.kurumsal, [
                { label: "Hakkımızda", href: `${base}/pages/hakkimizda` },
                { label: "İletişim", href: `${base}/contact` },
                { label: "Blog", href: `${base}/blog` },
                { label: "Sıkça Sorulan Sorular", href: `${base}/faq` },
            ]),
        },
        {
            title: "Müşteri Hizmetleri",
            links: parseLinks(sf.links?.musteri, [
                { label: "Sipariş Takip & İade", href: `${base}/track` },
                { label: "Hesabım", href: `${base}/account` },
                { label: "Siparişlerim", href: `${base}/account/orders` },
                { label: "Sepetim", href: `${base}/cart` },
            ]),
        },
        {
            title: "Kategoriler", // Kategoriler hala sabit veya eklenebilir
            links: [
                { label: "Havuz Kimyasalları", href: `${base}` },
                { label: "Filtre & Pompa", href: `${base}` },
                { label: "Temizlik Ekipmanları", href: `${base}` },
                { label: "Tüm Ürünler", href: `${base}` },
            ],
        },
        {
            title: "Yasal",
            links: parseLinks(sf.links?.yasal, [
                { label: "Gizlilik Politikası", href: `${base}/pages/gizlilik-politikasi` },
                { label: "Kullanım Koşulları", href: `${base}/pages/kullanim-kosullari` },
                { label: "İade & İptal Şartları", href: `${base}/pages/iade-sartlari` },
                { label: "Mesafeli Satış Sözleşmesi", href: `${base}/pages/mesafeli-satis` },
            ]),
        },
    ]

    const socials = [
        { icon: IgIcon, href: sf.socials?.instagram || "#", label: "Instagram" },
        { icon: FbIcon, href: sf.socials?.facebook || "#", label: "Facebook" },
        { icon: XIcon, href: sf.socials?.x || "#", label: "X" },
        { icon: YtIcon, href: sf.socials?.youtube || "#", label: "YouTube" },
    ].filter(s => s.href && s.href !== "#")

    // İletişim bilgileri fallback
    const contactPerson = sf.contact?.person || "Mustafa Gürcüler"
    const contactPhone = sf.contact?.phone || "0507 561 31 34"
    const contactEmail = sf.contact?.email || "destek@aquahavuz.com"
    const contactAddress = sf.contact?.address || "Kuşadası / Merkez"
    const brandName = tenant?.name || "Aqua Havuz"

    return (
        <footer className="relative mt-24 text-white">
            {/* Üst dalga ayırıcı */}
            <div className="absolute -top-px left-0 right-0 overflow-hidden leading-[0] rotate-180 pointer-events-none">
                <svg
                    className="relative block w-[calc(100%+1.3px)] h-[60px]"
                    viewBox="0 0 1200 120"
                    preserveAspectRatio="none"
                    aria-hidden
                >
                    <path
                        d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,30.43,512.34,53,583,72.05c69.27,18.48,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
                        style={{ fill: "var(--ag-primary, #11a3c9)", opacity: 0.18 }}
                    />
                </svg>
            </div>

            {/* Derin okyanus gradyanı + ışık huzmeleri */}
            <div
                className="relative"
                style={{
                    background:
                        "radial-gradient(1200px 400px at 80% 0%, color-mix(in srgb, var(--ag-primary, #11a3c9) 28%, transparent), transparent 60%), linear-gradient(180deg, #07202b 0%, #051018 100%)",
                }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
                    {/* Üst bant: marka + bülten */}
                    <div className="grid lg:grid-cols-2 gap-10 items-center pb-12 border-b border-white/10">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span
                                    className="grid place-items-center w-11 h-11 rounded-2xl shadow-lg"
                                    style={{ background: "var(--ag-primary, #11a3c9)" }}
                                >
                                    <Waves size={22} className="text-white" />
                                </span>
                                <span className="text-2xl font-heading font-bold tracking-tight">
                                    Aqua Havuz
                                </span>
                            </div>
                            <p className="text-white/60 leading-relaxed max-w-md">
                                Havuzunuzun berraklığı için ihtiyacınız olan her şey.
                                Dürüstlük odaklı, yapay zekâ destekli alışveriş deneyimi.
                            </p>
                        </div>
                        <div className="lg:justify-self-end w-full">
                            <h3 className="text-lg font-semibold mb-1">Fırsatlardan haberdar olun</h3>
                            <p className="text-sm text-white/55 mb-4">
                                E-bültenimize katılın, kampanyaları kaçırmayın.
                            </p>
                            <NewsletterForm />
                        </div>
                    </div>

                    {/* Güven şeridi */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-10 border-b border-white/10">
                        {trust.map((t) => (
                            <div key={t.title} className="flex items-center gap-3">
                                <span
                                    className="grid place-items-center w-12 h-12 rounded-xl shrink-0"
                                    style={{
                                        background: "rgba(255,255,255,0.06)",
                                        border: "1px solid rgba(255,255,255,0.12)",
                                    }}
                                >
                                    <t.icon size={22} style={{ color: "var(--ag-primary, #36c5e6)" }} />
                                </span>
                                <div>
                                    <div className="font-semibold text-sm">{t.title}</div>
                                    <div className="text-xs text-white/50">{t.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Kargo Takip bandı */}
                    <div className="py-10 border-b border-white/10">
                        <div className="max-w-2xl">
                            <CargoTracking />
                        </div>
                    </div>

                    {/* Link sütunları + iletişim */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 py-12">
                        {columns.map((col) => (
                            <div key={col.title}>
                                <h4 className="font-semibold mb-4 text-white/90">{col.title}</h4>
                                <ul className="space-y-2.5">
                                    {col.links.map((l) => (
                                        <li key={l.label}>
                                            <Link
                                                href={l.href}
                                                className="group inline-flex items-center text-sm text-white/55 hover:text-white transition-colors"
                                            >
                                                <ChevronRight
                                                    size={14}
                                                    className="-ml-1 mr-0.5 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
                                                    style={{ color: "var(--ag-primary, #36c5e6)" }}
                                                />
                                                {l.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}

                        {/* İletişim (2 sütun genişlik) */}
                        <div className="col-span-2">
                            <h4 className="font-semibold mb-4 text-white/90">İletişim</h4>
                            <ul className="space-y-3 text-sm text-white/60">
                                {contactPerson && (
                                <li className="flex items-center gap-3">
                                    <User size={18} className="shrink-0" style={{ color: "var(--ag-primary, #36c5e6)" }} />
                                    <span className="font-medium text-white/80">{contactPerson}</span>
                                </li>
                                )}
                                {contactAddress && (
                                <li className="flex items-start gap-3">
                                    <MapPin size={18} className="mt-0.5 shrink-0" style={{ color: "var(--ag-primary, #36c5e6)" }} />
                                    <span>{contactAddress}</span>
                                </li>
                                )}
                                {contactPhone && (
                                <li>
                                    <a href={`tel:${contactPhone.replace(/\s+/g, '')}`} className="flex items-center gap-3 hover:text-white transition-colors">
                                        <Phone size={18} className="shrink-0" style={{ color: "var(--ag-primary, #36c5e6)" }} />
                                        {contactPhone}
                                    </a>
                                </li>
                                )}
                                {contactEmail && (
                                <li>
                                    <a href={`mailto:${contactEmail}`} className="flex items-center gap-3 hover:text-white transition-colors">
                                        <Mail size={18} className="shrink-0" style={{ color: "var(--ag-primary, #36c5e6)" }} />
                                        {contactEmail}
                                    </a>
                                </li>
                                )}
                            </ul>
                            {/* Sosyal medya */}
                            {socials.length > 0 && (
                            <div className="flex items-center gap-3 mt-5">
                                {socials.map((s) => (
                                    <a
                                        key={s.label}
                                        href={s.href}
                                        aria-label={s.label}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="grid place-items-center w-10 h-10 rounded-full transition-all duration-300 hover:scale-110"
                                        style={{
                                            background: "rgba(255,255,255,0.06)",
                                            border: "1px solid rgba(255,255,255,0.12)",
                                        }}
                                    >
                                        <s.icon className="text-white/80" />
                                    </a>
                                ))}
                            </div>
                            )}
                        </div>
                    </div>

                    {/* Alt bar */}
                    <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-white/50">
                            © {year} {brandName}. Tüm hakları saklıdır.
                        </p>
                        <div className="flex items-center gap-4 text-white/55">
                            <span className="flex items-center gap-1.5 text-xs">
                                <Lock size={14} style={{ color: "var(--ag-primary, #36c5e6)" }} /> Güvenli Ödeme
                            </span>
                            <span className="flex items-center gap-2 text-xs">
                                <CreditCard size={16} /> Visa · Mastercard · Troy
                            </span>
                        </div>
                        <p className="text-xs text-white/40">
                            🤖 Ayna Genesis AI ile güçlendirilmiştir
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    )
}
