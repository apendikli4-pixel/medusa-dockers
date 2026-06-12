import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { getProductByHandle, getProductReviewStats, formatPrice } from "@/lib/server/data"
import { retrieveCurrentTenant } from "@/lib/server/tenant"
import { getBaseUrl } from "@/lib/server/base-url"
import { NEUTRAL_BRAND } from "@/lib/store-config"
import AddToCartButton from "@/components/AddToCartButton"
import WishlistButton from "@/components/WishlistButton"
import ProductReviews from "@/components/ProductReviews"

import { Metadata } from "next"

export async function generateMetadata({
    params,
}: {
    params: Promise<{ handle: string }>
}): Promise<Metadata> {
    const { handle } = await params
    const product = await getProductByHandle(handle)

    if (!product) {
        return { title: "Ürün Bulunamadı" }
    }

    return {
        // Marka eki root layout şablonundan gelir (%s | <mağaza adı>) — hardcode yok.
        title: product.title,
        description: product.description || `${product.title} satın al.`,
        openGraph: {
            title: product.title,
            description: product.description || "",
            images: product.thumbnail ? [product.thumbnail] : [],
        },
    }
}

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

    // Çoklu mağaza: marka + URL aktif mağazadan/host'tan türetilir.
    const [tenant, baseUrl, reviewStats] = await Promise.all([
        retrieveCurrentTenant(),
        getBaseUrl(),
        getProductReviewStats(product.id),
    ])
    const brandName = tenant?.name || NEUTRAL_BRAND

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.title,
        image: product.thumbnail ? [product.thumbnail] : [],
        description: product.description || product.title,
        sku: product.variants?.[0]?.sku || product.id,
        mpn: product.variants?.[0]?.sku || product.id,
        brand: {
            "@type": "Brand",
            name: brandName
        },
        // aggregateRating yalnızca GERÇEK onaylı yorumlardan üretilir; yorum yoksa
        // alan tamamen atlanır (Google yapılandırılmış veri politikası gereği).
        ...(reviewStats && {
            aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: reviewStats.average.toFixed(1),
                reviewCount: reviewStats.count,
                bestRating: "5",
                worstRating: "1"
            }
        }),
        offers: {
            "@type": "Offer",
            url: `${baseUrl}/${countryCode}/products/${product.handle}`,
            price: price?.calculated_amount || 0,
            priceCurrency: price?.currency_code?.toUpperCase() || "TRY",
            availability: "https://schema.org/InStock",
            itemCondition: "https://schema.org/NewCondition",
            priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
        }
    }

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Link href={`/${countryCode}`} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-8 transition-colors">
                ← Geri Dön
            </Link>
            
            <section className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
                {/* Sol Taraf: Görsel */}
                <div className="relative aspect-[4/5] md:aspect-square bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
                    {product.thumbnail ? (
                        <Image 
                            src={product.thumbnail} 
                            alt={product.title} 
                            fill
                            priority
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                            <span className="text-8xl font-heading font-bold text-gray-300">
                                {product.title.charAt(0)}
                            </span>
                        </div>
                    )}
                </div>
                
                {/* Sağ Taraf: Ürün/Villa Bilgileri */}
                <div className="flex flex-col pt-4 md:pt-8">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <h1 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 tracking-tight">
                            {product.title}
                        </h1>
                        <WishlistButton 
                            productId={product.id} 
                            className="w-12 h-12 bg-white rounded-full shadow-sm border border-gray-100 flex-shrink-0 mt-1" 
                        />
                    </div>
                    
                    <div className="text-2xl font-semibold text-[var(--ag-primary)] mb-6 pb-6 border-b border-gray-100">
                        {price ? formatPrice(price.calculated_amount, price.currency_code) : "Fiyat yok"}
                    </div>
                    
                    <div className="prose prose-gray mb-8">
                        <p className="text-gray-600 leading-relaxed text-lg">
                            {product.description || "Açıklama eklenmemiş."}
                        </p>
                    </div>
                    
                    {/* Villa & Rezervasyon / E-ticaret Ayrımı — sunucu tarafında
                        tenant.sector'a göre. (Önceki group-[html[data-sector]] CSS
                        seçicisi geçersizdi: atada .group sınıfı olmadığından villa
                        mağazasında rezervasyon kutusu HİÇ görünmüyordu.) */}
                    <div className="mt-auto pt-8">
                        {variant ? (
                            (tenant?.sector || "").toLowerCase() === "villa" ? (
                                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                    <h3 className="font-semibold text-gray-900 mb-4">Rezervasyon Yap</h3>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Giriş Tarihi</label>
                                            <input type="date" className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-[var(--ag-primary)] focus:border-transparent outline-none transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Çıkış Tarihi</label>
                                            <input type="date" className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-[var(--ag-primary)] focus:border-transparent outline-none transition-all" />
                                        </div>
                                    </div>
                                    <button className="w-full py-4 px-8 bg-[var(--ag-primary)] hover:bg-[var(--ag-primary-hover)] text-white rounded-xl font-medium shadow-md shadow-[var(--ag-primary)]/20 transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2">
                                        Müsaitliği Kontrol Et & Kirala
                                    </button>
                                </div>
                            ) : (
                                <AddToCartButton variantId={variant.id} />
                            )
                        ) : (
                            <p className="text-red-500 bg-red-50 p-4 rounded-xl border border-red-100 font-medium">Varyant tanımlanmamış</p>
                        )}
                    </div>
                </div>
            </section>
            
            <ProductReviews productId={product.id} />
        </main>
    )
}
