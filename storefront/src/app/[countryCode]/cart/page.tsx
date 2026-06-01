import Link from "next/link"
import { retrieveCart } from "@/lib/server/cart"
import CartItem from "@/components/CartItem"
import { formatPrice } from "@/lib/server/data"

export default async function CartPage({
    params,
}: {
    params: Promise<{ countryCode: string }>
}) {
    const { countryCode } = await params
    const cart = await retrieveCart()

    if (!cart || cart.items.length === 0) {
        return (
            <main className="ag-page">
                <h1 className="ag-section-title">Sepetiniz</h1>
                <div className="ag-empty">
                    <p>Sepetiniz boş.</p>
                    <Link href={`/${countryCode}`} className="ag-btn-primary" style={{ marginTop: "1rem", display: "inline-block" }}>
                        Ürünlere göz at
                    </Link>
                </div>
            </main>
        )
    }

    return (
        <main className="ag-page">
            <h1 className="ag-section-title">Sepetiniz</h1>
            <div className="ag-cart">
                <div className="ag-cart-list">
                    {cart.items.map((item) => (
                        <CartItem
                            key={item.id}
                            lineId={item.id}
                            title={item.title}
                            quantity={item.quantity}
                            unitPrice={item.unit_price}
                            currency={cart.currency_code}
                            thumbnail={item.thumbnail}
                        />
                    ))}
                </div>
                <aside className="ag-cart-summary">
                    <h3>Özet</h3>
                    <div className="ag-cart-row-sum">
                        <span>Ara toplam</span>
                        <strong>{formatPrice(cart.item_total ?? cart.subtotal, cart.currency_code)}</strong>
                    </div>
                    <div className="ag-cart-row-sum total">
                        <span>Toplam</span>
                        <strong>{formatPrice(cart.total, cart.currency_code)}</strong>
                    </div>
                    <Link
                        href={`/${countryCode}/checkout`}
                        className="ag-btn-primary ag-btn-full"
                        style={{ display: "block", textAlign: "center", marginTop: "1rem" }}
                    >
                        Güvenli Ödemeye Geç
                    </Link>
                    <Link href={`/${countryCode}`} className="ag-link-back">
                        ← Alışverişe devam et
                    </Link>
                </aside>
            </div>
        </main>
    )
}
