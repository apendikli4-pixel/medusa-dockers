import Link from "next/link"
import { retrieveCart } from "@/lib/server/cart"
import { retrieveCustomer } from "@/lib/server/customer"
import SearchBox from "./SearchBox"

export default async function Header({ countryCode }: { countryCode: string }) {
    const [cart, customer] = await Promise.all([
        retrieveCart(),
        retrieveCustomer(),
    ])
    const count = cart?.items?.reduce((acc, it) => acc + it.quantity, 0) || 0

    return (
        <header className="ag-header">
            <div className="ag-header-inner">
                <Link href={`/${countryCode}`} className="ag-brand">
                    <span className="ag-brand-mark">A</span>
                    <span>Ayna Genesis</span>
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
