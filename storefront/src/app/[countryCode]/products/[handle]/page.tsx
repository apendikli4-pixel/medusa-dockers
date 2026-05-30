import { notFound } from "next/navigation"
import Link from "next/link"
import { getProductByHandle, formatPrice } from "@/lib/server/data"
import AddToCartButton from "@/components/AddToCartButton"

export default async function ProductDetailPage({
    params,
}: {
    params: Promise<{ countryCode: string; handle: string }>
}) {
    const { countryCode, handle } = await params
    const product = await getProductByHandle(handle)
    if (!product) notFound()

    const variant = product.variants?.[0]
    const price = variant?.calculated_price

    return (
        <main className="ag-page">
            <Link href={`/${countryCode}`} className="ag-back">← Ürünlere dön</Link>
            <section className="ag-product-detail">
                <div className="ag-product-img">
                    {product.thumbnail ? (
                        <img src={product.thumbnail} alt={product.title} />
                    ) : (
                        <div className="ag-product-placeholder">{product.title.charAt(0)}</div>
                    )}
                </div>
                <div className="ag-product-info">
                    <h1>{product.title}</h1>
                    <p className="ag-product-desc">{product.description || "Açıklama eklenmemiş."}</p>
                    <div className="ag-product-price">
                        {price ? formatPrice(price.calculated_amount, price.currency_code) : "Fiyat yok"}
                    </div>
                    {variant ? (
                        <AddToCartButton variantId={variant.id} />
                    ) : (
                        <p className="ag-error">Varyant tanımlanmamış</p>
                    )}
                </div>
            </section>
        </main>
    )
}
