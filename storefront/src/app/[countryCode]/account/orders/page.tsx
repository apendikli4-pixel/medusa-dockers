import Link from "next/link"
import { redirect } from "next/navigation"
import { retrieveCustomer, listCustomerOrders } from "@/lib/server/customer"

export default async function OrdersPage({
    params,
    searchParams,
}: {
    params: Promise<{ countryCode: string }>
    searchParams: Promise<{ page?: string }>
}) {
    const { countryCode } = await params
    const sp = await searchParams
    const page = Math.max(1, parseInt(sp.page || "1", 10) || 1)
    const limit = 10
    const offset = (page - 1) * limit

    const customer = await retrieveCustomer()
    if (!customer) {
        redirect(
            `/${countryCode}/account/login?redirectTo=/${countryCode}/account/orders`
        )
    }

    const { orders, count } = await listCustomerOrders({ limit, offset })
    const totalPages = Math.max(1, Math.ceil(count / limit))

    return (
        <main className="ag-page">
            <Link href={`/${countryCode}/account`} className="ag-back">
                ← Hesabım
            </Link>
            <h1 className="ag-section-title">Siparişlerim</h1>

            {orders.length === 0 ? (
                <div className="ag-empty">
                    <p>Henüz siparişiniz yok.</p>
                    <Link href={`/${countryCode}`} className="ag-link">
                        Alışverişe başla →
                    </Link>
                </div>
            ) : (
                <>
                    <div className="ag-order-table">
                        <div className="ag-order-row ag-order-head">
                            <span>Sipariş</span>
                            <span>Tarih</span>
                            <span>Durum</span>
                            <span>Ödeme</span>
                            <span className="ag-order-total-col">Toplam</span>
                        </div>
                        {orders.map((o) => (
                            <Link
                                key={o.id}
                                href={`/${countryCode}/account/orders/${o.id}`}
                                className="ag-order-row"
                            >
                                <span className="ag-order-id">#{o.display_id}</span>
                                <span>
                                    {new Date(o.created_at).toLocaleDateString("tr-TR")}
                                </span>
                                <span className="ag-order-status">{o.status}</span>
                                <span className="ag-order-status">
                                    {o.payment_status || "—"}
                                </span>
                                <span className="ag-order-total-col">
                                    {new Intl.NumberFormat("tr-TR", {
                                        style: "currency",
                                        currency: o.currency_code?.toUpperCase() || "TRY",
                                    }).format(o.total / 100)}
                                </span>
                            </Link>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <nav className="ag-pagination">
                            {page > 1 && (
                                <Link
                                    href={`/${countryCode}/account/orders?page=${page - 1}`}
                                    className="ag-link"
                                >
                                    ← Önceki
                                </Link>
                            )}
                            <span>
                                Sayfa {page} / {totalPages}
                            </span>
                            {page < totalPages && (
                                <Link
                                    href={`/${countryCode}/account/orders?page=${page + 1}`}
                                    className="ag-link"
                                >
                                    Sonraki →
                                </Link>
                            )}
                        </nav>
                    )}
                </>
            )}
        </main>
    )
}
