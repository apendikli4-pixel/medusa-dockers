import { listProducts } from "@/lib/server/data"
import ProductCard from "@/components/ProductCard"

export default async function HomePage({
    params,
}: {
    params: Promise<{ countryCode: string }>
}) {
    const { countryCode } = await params
    const products = await listProducts(24)

    return (
        <main className="ag-page">
            <section className="ag-hero">
                <h1>Ayna Genesis</h1>
                <p>Dürüstlük odaklı e-ticaret — yapay zeka asistanlı, çok mağazalı.</p>
            </section>

            <section className="ag-grid-wrap">
                <h2 className="ag-section-title">Ürünler</h2>
                {products.length === 0 ? (
                    <div className="ag-empty">
                        <p>Henüz ürün eklenmemiş.</p>
                        <p className="ag-empty-hint">
                            Admin panelden ürün ekleyin:{" "}
                            <a href="http://localhost:9000/app/products" target="_blank" rel="noreferrer">
                                localhost:9000/app/products
                            </a>
                        </p>
                    </div>
                ) : (
                    <div className="ag-grid">
                        {products.map((p) => (
                            <ProductCard key={p.id} product={p} countryCode={countryCode} />
                        ))}
                    </div>
                )}
            </section>
        </main>
    )
}
