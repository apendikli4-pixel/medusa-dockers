import { listProducts } from "@/lib/server/data"
import { retrieveCurrentTenant } from "@/lib/server/tenant"
import { getSectorTheme } from "@/lib/themes"
import ProductCard from "@/components/ProductCard"
import CategorySidebar from "@/components/CategorySidebar"
import { Metadata } from "next"
import Image from "next/image"

export async function generateMetadata({ searchParams }: any): Promise<Metadata> {
    const tenant = await retrieveCurrentTenant()
    const { q } = await searchParams
    
    if (q) {
        return {
            title: `Arama: ${q}`,
            description: `"${q}" için arama sonuçları.`,
        }
    }
    
    return {
        title: "Ana Sayfa",
        description: "Ayna Genesis yapay zeka destekli otonom e-ticaret platformu.",
    }
}

import { cookies } from "next/headers"

async function getGenerativeUI() {
    try {
        const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
        const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
        const cookieStore = await cookies()
        
        const response = await fetch(`${backendUrl}/store/ayna/generative-ui`, {
            method: "GET",
            headers: {
                "x-publishable-api-key": publishableKey,
                "Cookie": cookieStore.toString()
            },
            next: { revalidate: 3600 } // Saatte bir veya session değişince yenilenir
        })
        
        if (response.ok) {
            return await response.json()
        }
    } catch (e) {
        console.error("[Generative UI] Error fetching UI:", e)
    }
    
    return null
}

export default async function HomePage({
    params,
    searchParams,
}: {
    params: Promise<{ countryCode: string }>
    searchParams: Promise<{ q?: string }>
}) {
    const { countryCode } = await params
    const { q } = await searchParams
    
    // Generative UI verisini çek (eğer kullanıcı arama yapmamışsa)
    const genUI = !q ? await getGenerativeUI() : null

    const recommendedQ = genUI?.recommendedSearchQuery || q
    
    const [products, tenant] = await Promise.all([
        listProducts({ q: recommendedQ, limit: 24 }),
        retrieveCurrentTenant(),
    ])
    
    const theme = getSectorTheme(tenant?.sector)
    const heroTitle = genUI?.heroTitle || tenant?.name || "Ayna Genesis"
    const heroTagline = genUI?.heroTagline || theme.tagline || "Dürüstlük odaklı e-ticaret — yapay zeka asistanlı, çok mağazalı."
    const isPremium = genUI?.themeMode === "premium" || genUI?.themeMode === "dark"
    // Hero görseli: admin Vitrin Ayarları'ndan (tenant) gelir; yoksa varsayılan dosya.
    const heroImage = tenant?.storefront?.heroImage || "/images/premium_hero_banner.jpg"

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            {!q && (
                <section className={`relative w-full min-h-[600px] flex items-center justify-center mb-16 rounded-3xl overflow-hidden ${isPremium ? 'premium-shadow' : 'shadow-xl'}`}>
                    {/* Background Image */}
                    <div className="absolute inset-0 z-0">
                        <div className={`absolute inset-0 ${isPremium ? 'bg-slate-900/40' : 'bg-blue-900/30'} z-10 mix-blend-multiply`}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#fafafa] via-transparent to-transparent z-10 opacity-60"></div>
                        <Image
                            src={heroImage}
                            alt="Premium Hero"
                            fill
                            priority
                            fetchPriority="high"
                            sizes="(max-width: 768px) 100vw, 100vw"
                            className="object-cover object-center"
                            unoptimized={heroImage.startsWith("http")}
                        />
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-20 flex flex-col items-center text-center px-4 md:px-12 max-w-4xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <span className="px-5 py-2 rounded-full glass-panel text-white/90 text-xs font-bold uppercase tracking-[0.2em] mb-8 animate-float">
                            YAPAY ZEKA ÖZEL SEÇİMİ
                        </span>
                        <h1 className="font-heading font-bold text-5xl md:text-7xl lg:text-8xl mb-6 tracking-tight text-white drop-shadow-lg leading-tight">
                            {heroTitle}
                        </h1>
                        <p className="text-lg md:text-2xl text-slate-200 font-light leading-relaxed drop-shadow-md max-w-2xl mb-10">
                            {heroTagline}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <button className="px-8 py-4 bg-white text-slate-900 rounded-full font-semibold hover:bg-slate-100 hover-elevate shadow-xl transition-all">
                                Koleksiyonu Keşfet
                            </button>
                            <button className="px-8 py-4 bg-transparent border border-white/50 text-white rounded-full font-semibold hover:bg-white/10 hover-elevate transition-all backdrop-blur-sm">
                                Daha Fazla Bilgi
                            </button>
                        </div>
                    </div>
                </section>
            )}

            <div className="flex flex-col lg:flex-row gap-10">
                <div className="w-full lg:w-64 flex-shrink-0">
                    <CategorySidebar countryCode={countryCode} />
                </div>
                
                <section className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
                        <h2 className="font-heading font-semibold text-3xl text-gray-900 tracking-tight">
                            {q ? `"${q}" için sonuçlar (${products.length})` : (genUI?.recommendedSearchQuery ? `Sizin İçin Önerilenler` : "Öne Çıkan Ürünler")}
                        </h2>
                    </div>

                    {products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 px-4 bg-white rounded-3xl border border-dashed border-gray-300 text-center shadow-sm">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <span className="text-3xl">🔍</span>
                            </div>
                            <h3 className="font-heading font-medium text-xl text-gray-900 mb-2">
                                {q || genUI?.recommendedSearchQuery ? "Aradığınız kriterlere uygun ürün bulunamadı." : "Henüz ürün eklenmemiş."}
                            </h3>
                            <p className="text-gray-500 mb-6">
                                Farklı anahtar kelimeler deneyebilir veya kategorilere göz atabilirsiniz.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
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
