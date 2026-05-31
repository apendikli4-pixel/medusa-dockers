import { listProducts } from "@/lib/server/data"
import { retrieveCurrentTenant } from "@/lib/server/tenant"
import { getSectorTheme } from "@/lib/themes"
import ProductCard from "@/components/ProductCard"
import CategorySidebar from "@/components/CategorySidebar"

export default async function HomePage({
    params,
    searchParams,
}: {
    params: Promise<{ countryCode: string }>
    searchParams: Promise<{ q?: string }>
}) {
    const { countryCode } = await params
    const { q } = await searchParams
    const [products, tenant] = await Promise.all([
        listProducts({ q, limit: 24 }),
        retrieveCurrentTenant(),
    ])
    const theme = getSectorTheme(tenant?.sector)
    const heroTitle = tenant?.name || "Ayna Genesis"
    const heroTagline =
        theme.tagline ||
        "Dürüstlük odaklı e-ticaret — yapay zeka asistanlı, çok mağazalı."

    return (
        <main className="ag-page">
            {!q && (
                <section className="ag-hero">
                    <h1>{heroTitle}</h1>
                    <p>{heroTagline}</p>
                </section>
            )}

            <div className="ag-layout">
                <CategorySidebar countryCode={countryCode} />
                <section className="ag-content">
                    <h2 className="ag-section-title">
                        {q ? `"${q}" için sonuçlar (${products.length})` : "Tüm Ürünler"}
                    </h2>
                    {products.length === 0 ? (
                        <div className="ag-empty">
                            <p>{q ? "Aradığınız kriterlere uygun ürün bulunamadı." : "Henüz ürün eklenmemiş."}</p>
                            {!q && (
                                <p className="ag-empty-hint">
                                    Admin panelden ürün ekleyin:{" "}
                                    <a href="http://localhost:9000/app/products" target="_blank" rel="noreferrer">
                                        localhost:9000/app/products
                                    </a>
                                </p>
                            )}
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
