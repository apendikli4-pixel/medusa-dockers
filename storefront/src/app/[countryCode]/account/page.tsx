import Link from "next/link"
import { redirect } from "next/navigation"
import { retrieveCustomer, listCustomerOrders } from "@/lib/server/customer"
import LogoutButton from "@/components/LogoutButton"

export default async function AccountPage({
    params,
}: {
    params: Promise<{ countryCode: string }>
}) {
    const { countryCode } = await params
    const customer = await retrieveCustomer()
    if (!customer) {
        redirect(`/${countryCode}/account/login?redirectTo=/${countryCode}/account`)
    }

    const { orders, count } = await listCustomerOrders({ limit: 5 })

    const fullName = [customer.first_name, customer.last_name]
        .filter(Boolean)
        .join(" ") || customer.email

    return (
        <main className="ag-page">
            <div className="ag-account-header">
                <div>
                    <h1>Merhaba, {fullName} 👋</h1>
                    <p className="ag-muted">{customer.email}</p>
                </div>
                <LogoutButton countryCode={countryCode} />
            </div>

            <div className="ag-account-grid">
                <section className="ag-account-card">
                    <h2>Hesap Bilgileri</h2>
                    <dl className="ag-dl">
                        <dt>Ad Soyad</dt>
                        <dd>
                            {customer.first_name || customer.last_name
                                ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
                                : "—"}
                        </dd>
                        <dt>E-posta</dt>
                        <dd>{customer.email}</dd>
                        <dt>Telefon</dt>
                        <dd>{customer.phone || "—"}</dd>
                    </dl>
                    
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <Link 
                            href={`/${countryCode}/account/wishlist`} 
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-red-500">❤️</span>
                                <span className="font-medium text-gray-900">Favorilerim</span>
                            </div>
                            <span className="text-gray-400">→</span>
                        </Link>
                    </div>
                </section>

                <section className="ag-account-card">
                    <div className="ag-card-head">
                        <h2>Son Siparişler</h2>
                        {count > 0 && (
                            <Link
                                href={`/${countryCode}/account/orders`}
                                className="ag-link"
                            >
                                Tümü ({count})
                            </Link>
                        )}
                    </div>
                    {orders.length === 0 ? (
                        <div className="ag-empty">
                            <p>Henüz siparişiniz yok.</p>
                            <Link href={`/${countryCode}`} className="ag-link">
                                Alışverişe başla →
                            </Link>
                        </div>
                    ) : (
                        <ul className="ag-order-mini-list">
                            {orders.map((o) => (
                                <li key={o.id}>
                                    <Link
                                        href={`/${countryCode}/account/orders/${o.id}`}
                                        className="ag-order-mini"
                                    >
                                        <span className="ag-order-id">#{o.display_id}</span>
                                        <span className="ag-order-date">
                                            {new Date(o.created_at).toLocaleDateString(
                                                "tr-TR"
                                            )}
                                        </span>
                                        <span className="ag-order-status">{o.status}</span>
                                        <span className="ag-order-total">
                                            {new Intl.NumberFormat("tr-TR", {
                                                style: "currency",
                                                currency: o.currency_code?.toUpperCase() || "TRY",
                                            }).format(o.total / 100)}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </main>
    )
}
