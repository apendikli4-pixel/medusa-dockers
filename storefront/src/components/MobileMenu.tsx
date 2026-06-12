"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    Menu, X, User, UserPlus, ShoppingBag, Heart,
    Truck, Home, MessageCircleQuestion, Mail, Newspaper,
} from "lucide-react"
import SearchBox from "./SearchBox"

/**
 * Mobil menü (hamburger + soldan açılan çekmece).
 * Header server component olduğundan etkileşim bu client bileşende yaşar.
 * Masaüstünde gizli (md:hidden) — masaüstü nav Header'da ayrı durur.
 */
export default function MobileMenu({
    countryCode,
    loggedIn,
    customerLabel,
}: {
    countryCode: string
    loggedIn: boolean
    customerLabel?: string | null
}) {
    const [open, setOpen] = useState(false)
    // Portal için: document yalnızca istemcide var (SSR'da render edilmez).
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    const base = `/${countryCode}`
    const pathname = usePathname()

    // Rota değişince menüyü kapat (link tıklamalarını tek tek bağlamaya gerek kalmaz).
    useEffect(() => {
        setOpen(false)
    }, [pathname])

    // Çekmece açıkken arka plan kaymasın.
    useEffect(() => {
        if (open) {
            const prev = document.body.style.overflow
            document.body.style.overflow = "hidden"
            return () => {
                document.body.style.overflow = prev
            }
        }
    }, [open])

    const mainLinks = [
        { href: base, label: "Ana Sayfa", icon: Home },
        { href: `${base}/cart`, label: "Sepetim", icon: ShoppingBag },
        { href: `${base}/account/wishlist`, label: "Favorilerim", icon: Heart },
        { href: `${base}/track`, label: "Sipariş Takip & İade", icon: Truck },
        { href: `${base}/blog`, label: "Blog", icon: Newspaper },
        { href: `${base}/faq`, label: "Sıkça Sorulan Sorular", icon: MessageCircleQuestion },
        { href: `${base}/contact`, label: "İletişim", icon: Mail },
    ]

    return (
        <div className="md:hidden">
            <button
                onClick={() => setOpen(true)}
                className="p-2 -ml-2 hover:opacity-70 transition-opacity"
                style={{ color: "var(--ag-text)" }}
                aria-label="Menüyü aç"
                aria-expanded={open}
            >
                <Menu size={24} />
            </button>

            {/* Çekmece body'ye portallanır: header'ın backdrop-filter'ı fixed
                elemanların referans kutusunu header'a çevirir (72px'e hapsolur);
                portal bu tuzaktan çıkarır. */}
            {mounted && createPortal(
            <AnimatePresence>
                {open && (
                    <>
                        {/* Karartma */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
                            onClick={() => setOpen(false)}
                            aria-hidden
                        />

                        {/* Çekmece */}
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                            className="fixed inset-y-0 left-0 z-[70] w-[min(320px,calc(100vw-3rem))] flex flex-col shadow-2xl"
                            style={{ background: "var(--ag-bg-card, #fff)", color: "var(--ag-text)" }}
                            role="dialog"
                            aria-modal="true"
                            aria-label="Mobil menü"
                        >
                            <div
                                className="flex items-center justify-between px-5 py-4 border-b"
                                style={{ borderColor: "var(--ag-border)" }}
                            >
                                <span className="font-heading font-bold text-lg">Menü</span>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="p-2 -mr-2 hover:opacity-70 transition-opacity"
                                    aria-label="Menüyü kapat"
                                >
                                    <X size={22} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">
                                {/* Arama — masaüstündeki kutunun mobil karşılığı.
                                    Sarmalayıcı sınıf, .ag-search'ün header'a özel
                                    mobil kuralını (order:3, flex-basis:100%) nötrler. */}
                                <div className="mobile-menu-search">
                                    <SearchBox countryCode={countryCode} />
                                </div>

                                {/* Hesap */}
                                <div className="flex flex-col gap-1">
                                    <span
                                        className="text-xs font-semibold uppercase tracking-wider mb-1"
                                        style={{ color: "var(--ag-muted)" }}
                                    >
                                        Hesap
                                    </span>
                                    {loggedIn ? (
                                        <>
                                            <Link
                                                href={`${base}/account`}
                                                className="flex items-center gap-3 py-2.5 font-medium hover:opacity-70 transition-opacity"
                                            >
                                                <User size={18} style={{ color: "var(--ag-muted)" }} />
                                                {customerLabel || "Hesabım"}
                                            </Link>
                                            <Link
                                                href={`${base}/account/orders`}
                                                className="flex items-center gap-3 py-2.5 font-medium hover:opacity-70 transition-opacity"
                                            >
                                                <Truck size={18} style={{ color: "var(--ag-muted)" }} />
                                                Siparişlerim
                                            </Link>
                                        </>
                                    ) : (
                                        <>
                                            <Link
                                                href={`${base}/account/login`}
                                                className="flex items-center gap-3 py-2.5 font-medium hover:opacity-70 transition-opacity"
                                            >
                                                <User size={18} style={{ color: "var(--ag-muted)" }} />
                                                Giriş Yap
                                            </Link>
                                            <Link
                                                href={`${base}/account/register`}
                                                className="flex items-center gap-3 py-2.5 font-medium hover:opacity-70 transition-opacity"
                                            >
                                                <UserPlus size={18} style={{ color: "var(--ag-muted)" }} />
                                                Üye Ol
                                            </Link>
                                        </>
                                    )}
                                </div>

                                {/* Gezinme */}
                                <div className="flex flex-col gap-1">
                                    <span
                                        className="text-xs font-semibold uppercase tracking-wider mb-1"
                                        style={{ color: "var(--ag-muted)" }}
                                    >
                                        Mağaza
                                    </span>
                                    {mainLinks.map((l) => (
                                        <Link
                                            key={l.href}
                                            href={l.href}
                                            className="flex items-center gap-3 py-2.5 font-medium hover:opacity-70 transition-opacity"
                                        >
                                            <l.icon size={18} style={{ color: "var(--ag-muted)" }} />
                                            {l.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>,
            document.body
            )}
        </div>
    )
}
