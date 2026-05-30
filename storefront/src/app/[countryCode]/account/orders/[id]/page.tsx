import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { retrieveCustomer, retrieveCustomerOrder } from "@/lib/server/customer"

export default async function OrderDetailPage({
    params,
}: {
    params: Promise<{ countryCode: string; id: string }>
}) {
    const { countryCode, id } = await params

    const customer = await retrieveCustomer()
    if (!customer) {
        redirect(
            `/${countryCode}/account/login?redirectTo=/${countryCode}/account/orders/${id}`
        )
    }

    const order = await retrieveCustomerOrder(id)
    if (!order) notFound()

    const fmtPrice = (cents: number) =>
        new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency: order.currency_code?.toUpperCase() || "TRY",
        }).format(cents / 100)

    return (
        <main className="ag-page">
            <Link href={`/${countryCode}/account/orders`} className="ag-back">
                ← Tüm siparişler
            </Link>

            <header className="ag-order-detail-head">
                <div>
                    <h1>Sipariş #{order.display_id}</h1>
                    <p className="ag-muted">
                        {new Date(order.created_at).toLocaleString("tr-TR")}
                    </p>
                </div>
                <div className="ag-order-status-badges">
                    <span className="ag-badge">Durum: {order.status}</span>
                    {order.payment_status && (
                        <span className="ag-badge">Ödeme: {order.payment_status}</span>
                    )}
                    {order.fulfillment_status && (
                        <span className="ag-badge">
                            Kargo: {order.fulfillment_status}
                        </span>
                    )}
                </div>
            </header>

            <section className="ag-card" style={{ padding: "1rem", marginTop: "1rem" }}>
                <h2 style={{ marginTop: 0 }}>Ürünler</h2>
                {(order.items || []).map((it) => (
                    <div key={it.id} className="ag-cart-row">
                        <div className="ag-cart-thumb">
                            {it.thumbnail ? (
                                <img src={it.thumbnail} alt={it.title} />
                            ) : (
                                <span className="ag-cart-thumb-ph">📦</span>
                            )}
                        </div>
                        <div className="ag-cart-info">
                            <h4>{it.title}</h4>
                            <p className="ag-cart-unit">{fmtPrice(it.unit_price)} × {it.quantity}</p>
                        </div>
                        <div />
                        <div />
                        <div className="ag-cart-total">{fmtPrice(it.total)}</div>
                    </div>
                ))}
            </section>

            <section className="ag-cart-summary" style={{ marginTop: "1rem" }}>
                <h3>Özet</h3>
                <div className="ag-cart-row-sum">
                    <span>Ara toplam</span>
                    <span>{fmtPrice(order.subtotal)}</span>
                </div>
                <div className="ag-cart-row-sum total">
                    <strong>Toplam</strong>
                    <strong>{fmtPrice(order.total)}</strong>
                </div>
            </section>
        </main>
    )
}
