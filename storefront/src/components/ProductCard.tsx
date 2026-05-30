import Link from "next/link"
import type { StoreProduct } from "@/lib/server/data"
import { formatPrice } from "@/lib/server/data"

export default function ProductCard({ product, countryCode }: { product: StoreProduct; countryCode: string }) {
    const firstVariant = product.variants?.[0]
    const price = firstVariant?.calculated_price
    return (
        <Link href={`/${countryCode}/products/${product.handle}`} className="ag-card">
            <div className="ag-card-img">
                {product.thumbnail ? (
                    <img src={product.thumbnail} alt={product.title} />
                ) : (
                    <div className="ag-card-placeholder">{product.title.charAt(0)}</div>
                )}
            </div>
            <div className="ag-card-body">
                <h3 className="ag-card-title">{product.title}</h3>
                <p className="ag-card-desc">{product.description?.substring(0, 80) || ""}</p>
                <div className="ag-card-price">
                    {price ? formatPrice(price.calculated_amount, price.currency_code) : "Fiyat yok"}
                </div>
            </div>
        </Link>
    )
}
