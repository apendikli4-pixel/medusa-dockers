import Link from "next/link"
import { notFound } from "next/navigation"
import { getAuthedMedusaClient, sdk } from "@/lib/medusa-client"
import { formatPrice } from "@/lib/format"

/**
 * Sipariş onay sayfası — checkout tamamlandıktan sonra gösterilir.
 *
 * Order'ı önce authed client ile (oturum açık müşteri), olmazsa public sdk
 * ile çekmeye çalışır. Order ID URL'de geldiği için tahmin edilemez.
 */
export default async function OrderConfirmedPage({
    params,
}: {
    params: Promise<{ countryCode: string; id: string }>
}) {
    const { countryCode, id } = await params

    const fields =
        "id,display_id,email,currency_code,total,subtotal,shipping_total,tax_total," +
        "items.title,items.quantity,items.unit_price,items.total,items.thumbnail," +
        "shipping_address.*,shipping_methods.name,shipping_methods.amount"

    let order: any = null
    try {
        const authed = await getAuthedMedusaClient()
        const res = await authed.store.order.retrieve(id, { fields })
        order = res.order
    } catch {
        try {
            const res = await sdk.store.order.retrieve(id, { fields })
            order = res.order
        } catch {
            order = null
        }
    }

    if (!order) notFound()
    const cur = order.currency_code

    return (
        <main className="ag-page">
            <div className="ag-order-success">
                <div className="ag-success-icon">✓</div>
                <h1>Siparişiniz alındı!</h1>
                <p className="ag-muted">
                    Sipariş No: <strong>#{order.display_id}</strong>
                </p>
                <p className="ag-muted">
                    Onay e-postası {order.email} adresine gönderildi.
                </p>
            </div>

            <div className="ag-order-confirm-grid">
                <section className="ag-account-card">
                    <h2>Sipariş Detayı</h2>
                    {(order.items || []).map((it: any, i: number) => (
                        <div key={i} className="ag-cart-row">
                            <div className="ag-cart-thumb">
                                {it.thumbnail ? (
                                    <img src={it.thumbnail} alt={it.title} />
                                ) : (
                                    <span className="ag-cart-thumb-ph">📦</span>
                                )}
                            </div>
                            <div className="ag-cart-info">
                                <h4>{it.title}</h4>
                                <p className="ag-cart-unit">
                                    {formatPrice(it.unit_price, cur)} × {it.quantity}
                                </p>
                            </div>
                            <div />
                            <div />
                            <div className="ag-cart-total">
                                {formatPrice(
                                    it.total ?? it.unit_price * it.quantity,
                                    cur
                                )}
                            </div>
                        </div>
                    ))}
                </section>

                <aside className="ag-cart-summary">
                    <h3>Özet</h3>
                    <div className="ag-cart-row-sum">
                        <span>Ara toplam</span>
                        <span>{formatPrice(order.subtotal, cur)}</span>
                    </div>
                    <div className="ag-cart-row-sum">
                        <span>Kargo</span>
                        <span>{formatPrice(order.shipping_total, cur)}</span>
                    </div>
                    {order.tax_total > 0 && (
                        <div className="ag-cart-row-sum">
                            <span>KDV</span>
                            <span>{formatPrice(order.tax_total, cur)}</span>
                        </div>
                    )}
                    <div className="ag-cart-row-sum total">
                        <strong>Toplam</strong>
                        <strong>{formatPrice(order.total, cur)}</strong>
                    </div>
                    <div
                        className="ag-review-block"
                        style={{ marginTop: "1rem" }}
                    >
                        <h4>Teslimat</h4>
                        <p>
                            {order.shipping_address?.first_name}{" "}
                            {order.shipping_address?.last_name}
                            <br />
                            {order.shipping_address?.address_1}
                            <br />
                            {order.shipping_address?.postal_code}{" "}
                            {order.shipping_address?.city}
                        </p>
                    </div>
                    <Link
                        href={`/${countryCode}`}
                        className="ag-btn-primary ag-btn-full"
                        style={{
                            marginTop: "1rem",
                            display: "block",
                            textAlign: "center",
                        }}
                    >
                        Alışverişe devam et
                    </Link>
                </aside>
            </div>
        </main>
    )
}
