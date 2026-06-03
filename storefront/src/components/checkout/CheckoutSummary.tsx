import { formatPrice } from "@/lib/format"
import Image from "next/image"
import type { CheckoutCart } from "@/lib/server/checkout"

/**
 * Sipariş özeti sidebar — checkout boyunca sağda sabit durur.
 */
export default function CheckoutSummary({ cart }: { cart: CheckoutCart }) {
    const cur = cart.currency_code
    return (
        <aside className="ag-checkout-summary">
            <h3>Sipariş Özeti</h3>

            <ul className="ag-checkout-items">
                {cart.items.map((it) => (
                    <li key={it.id} className="ag-checkout-item">
                        <div className="ag-checkout-thumb relative w-12 h-12">
                            {it.thumbnail ? (
                                <Image 
                                    src={it.thumbnail} 
                                    alt={it.title} 
                                    fill
                                    className="object-cover rounded"
                                    sizes="48px"
                                />
                            ) : (
                                <span className="ag-checkout-thumb-ph">📦</span>
                            )}
                            <span className="ag-checkout-qty">{it.quantity}</span>
                        </div>
                        <div className="ag-checkout-item-info">
                            <span className="ag-checkout-item-title">{it.title}</span>
                            <span className="ag-checkout-item-unit">
                                {formatPrice(it.unit_price, cur)}
                            </span>
                        </div>
                        <span className="ag-checkout-item-total">
                            {formatPrice(it.total ?? it.unit_price * it.quantity, cur)}
                        </span>
                    </li>
                ))}
            </ul>

            <div className="ag-checkout-totals">
                <div className="ag-cart-row-sum">
                    <span>Ara toplam</span>
                    <span>{formatPrice(cart.subtotal, cur)}</span>
                </div>
                <div className="ag-cart-row-sum">
                    <span>Kargo</span>
                    <span>
                        {cart.shipping_total > 0
                            ? formatPrice(cart.shipping_total, cur)
                            : "—"}
                    </span>
                </div>
                {cart.tax_total > 0 && (
                    <div className="ag-cart-row-sum">
                        <span>KDV</span>
                        <span>{formatPrice(cart.tax_total, cur)}</span>
                    </div>
                )}
                <div className="ag-cart-row-sum total">
                    <strong>Toplam</strong>
                    <strong>{formatPrice(cart.total, cur)}</strong>
                </div>
            </div>
        </aside>
    )
}
