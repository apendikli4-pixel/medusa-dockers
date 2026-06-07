import Link from "next/link"
import { retrieveCart } from "@/lib/server/cart"
import { retrieveCustomer } from "@/lib/server/customer"
import { retrieveCurrentTenant } from "@/lib/server/tenant"
import { getSectorTheme } from "@/lib/themes"
import SearchBox from "./SearchBox"
import { ShoppingBag, User, Menu } from "lucide-react"

export default async function Header({ countryCode }: { countryCode: string }) {
    const [cart, customer, tenant] = await Promise.all([
        retrieveCart(),
        retrieveCustomer(),
        retrieveCurrentTenant(),
    ])
    const count = cart?.items?.reduce((acc, it) => acc + it.quantity, 0) || 0
    const theme = getSectorTheme(tenant?.sector)
    const brandName = tenant?.name || "Ayna Genesis"
    const brandLetter = (tenant?.name?.trim()[0] || "A").toUpperCase()

    return (
        <header className="glass-header">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-8">

                {/* Mobile Menu Icon */}
                <button
                    className="md:hidden hover:opacity-70 transition-opacity"
                    style={{ color: "var(--ag-text)" }}
                    aria-label="Menü"
                >
                    <Menu size={24} />
                </button>

                {/* Brand Logo */}
                <Link href={`/${countryCode}`} className="flex items-center gap-3 group">
                    <span
                        className="flex items-center justify-center w-10 h-10 rounded-xl font-bold text-lg shadow-md group-hover:scale-105 group-hover:-rotate-3 transition-transform duration-500"
                        style={{
                            background: theme.brandMark.background,
                            color: theme.brandMark.color,
                        }}
                    >
                        {brandLetter}
                    </span>
                    <span
                        className="font-heading font-bold text-2xl tracking-tighter transition-colors duration-300 group-hover:opacity-80"
                        style={{ color: "var(--ag-text)" }}
                    >
                        {brandName}
                    </span>
                </Link>

                {/* Search */}
                <div className="flex-1 max-w-2xl hidden md:block px-8">
                    <SearchBox countryCode={countryCode} />
                </div>

                {/* Navigation */}
                <nav
                    className="hidden md:flex items-center gap-8 font-medium text-[15px]"
                    style={{ color: "var(--ag-muted)" }}
                >
                    <Link
                        href={`/${countryCode}`}
                        className="relative group transition-opacity hover:opacity-100 py-2"
                        style={{ color: "var(--ag-text)" }}
                    >
                        <span>Koleksiyon</span>
                        <span
                            className="absolute left-0 bottom-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full"
                            style={{ background: "var(--ag-primary)" }}
                        ></span>
                    </Link>

                    <Link
                        href={`/${countryCode}/blog`}
                        className="relative group transition-opacity hover:opacity-100 py-2"
                        style={{ color: "var(--ag-text)" }}
                    >
                        <span>Blog</span>
                        <span
                            className="absolute left-0 bottom-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full"
                            style={{ background: "var(--ag-primary)" }}
                        ></span>
                    </Link>

                    {customer ? (
                        <Link
                            href={`/${countryCode}/account`}
                            className="flex items-center gap-2 transition-opacity hover:opacity-80 group py-2"
                            style={{ color: "var(--ag-text)" }}
                        >
                            <User size={18} style={{ color: "var(--ag-muted)" }} />
                            <span>
                                {customer.first_name || customer.email.split("@")[0]}
                            </span>
                        </Link>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link
                                href={`/${countryCode}/account/login`}
                                className="relative group transition-opacity hover:opacity-80 py-2 flex items-center gap-2"
                                style={{ color: "var(--ag-text)" }}
                            >
                                <User size={18} style={{ color: "var(--ag-muted)" }} />
                                <span>Giriş Yap</span>
                                <span
                                    className="absolute left-0 bottom-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full"
                                    style={{ background: "var(--ag-primary)" }}
                                ></span>
                            </Link>
                            <Link
                                href={`/${countryCode}/account/register`}
                                className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:opacity-90 border"
                                style={{ borderColor: "var(--ag-primary)", color: "var(--ag-primary)" }}
                            >
                                Üye Ol
                            </Link>
                        </div>
                    )}

                    <Link
                        href={`/${countryCode}/cart`}
                        className="relative flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 group shadow-sm hover:opacity-90"
                        style={{
                            background: "var(--ag-primary)",
                            color: "var(--ag-on-primary, #fff)",
                        }}
                    >
                        <ShoppingBag size={18} className="group-hover:scale-110 transition-transform duration-300" />
                        <span>Sepet</span>
                        {count > 0 && (
                            <span
                                className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full text-white text-[0.7rem] font-bold shadow-md"
                                style={{ background: "var(--ag-accent)" }}
                            >
                                {count}
                            </span>
                        )}
                    </Link>
                </nav>

                {/* Mobile Cart */}
                <Link
                    href={`/${countryCode}/cart`}
                    className="md:hidden relative p-2"
                    style={{ color: "var(--ag-text)" }}
                    aria-label={`Sepet${count > 0 ? `, ${count} ürün` : ""}`}
                >
                    <ShoppingBag size={24} />
                    {count > 0 && (
                        <span
                            className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 rounded-full text-white text-[0.6rem] font-bold"
                            style={{ background: "var(--ag-accent)" }}
                        >
                            {count}
                        </span>
                    )}
                </Link>
            </div>
        </header>
    )
}
