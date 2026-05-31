import Link from "next/link"
import { retrieveCart } from "@/lib/server/cart"
import { retrieveCustomer } from "@/lib/server/customer"
import { retrieveCurrentTenant } from "@/lib/server/tenant"
import { getSectorTheme } from "@/lib/themes"
import SearchBox from "./SearchBox"

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
        <header className="ag-header">
            <div className="ag-header-inner">
                <Link href={`/${countryCode}`} className="ag-brand">
                    <span
                        className="ag-brand-mark"
                        style={{
                            background: theme.brandMark.background,
                            color: theme.brandMark.color,
                        }}
                    >
                        {brandLetter}
                    </span>
                    <span>{brandName}</span>
                </Link>
                <SearchBox countryCode={countryCode} />
                <nav className="ag-nav">
                    <Link href={`/${countryCode}`}>Mağaza</Link>
                    {customer ? (
                        <Link
                            href={`/${countryCode}/account`}
                            className="ag-nav-account"
                        >
                            <span aria-hidden>👤</span>
                            <span>
                                {customer.first_name ||
                                    customer.email.split("@")[0]}
                            </span>
                        </Link>
                    ) : (
                        <Link href={`/${countryCode}/account/login`}>Giriş Yap</Link>
                    )}
                    <Link href={`/${countryCode}/cart`} className="ag-cart-link">
                        <span>Sepet</span>
                        {count > 0 && (
                            <span className="ag-cart-badge">{count}</span>
                        )}
                    </Link>
                </nav>
            </div>
        </header>
    )
}
