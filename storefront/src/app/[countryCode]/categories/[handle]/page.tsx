import { notFound } from "next/navigation"
import { listProducts, getCategoryByHandle } from "@/lib/server/data"
import ProductCard from "@/components/ProductCard"
import CategorySidebar from "@/components/CategorySidebar"

export default async function CategoryPage({
    params,
}: {
    params: Promise<{ countryCode: string; handle: string }>
}) {
    const { countryCode, handle } = await params
    const category = await getCategoryByHandle(handle)
    if (!category) notFound()

    const products = await listProducts({ categoryHandle: handle, limit: 48 })

    return (
        <main className="ag-page">
            <div className="ag-layout">
                <CategorySidebar countryCode={countryCode} activeHandle={handle} />
                <section className="ag-content">
                    <h2 className="ag-section-title">{category.name}</h2>
                    {products.length === 0 ? (
                        <div className="ag-empty">
                            <p>Bu kategoride henüz ürün yok.</p>
                        </div>
                    ) : (
                        <div className="ag-grid">
                            {products.map((p) => (
                                <ProductCard key={p.id} product={p} countryCode={countryCode} />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}
