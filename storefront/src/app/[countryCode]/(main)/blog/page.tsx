import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { listBlogPosts, formatBlogDate } from "@/lib/server/blog"
import { ArrowRight, Sparkles } from "lucide-react"

export const metadata: Metadata = {
    title: "Blog",
    description: "Uzman içerikler, yapay zeka rehberleri ve sektörel ipuçları.",
}

export default async function BlogListPage({
    params,
    searchParams,
}: {
    params: Promise<{ countryCode: string }>
    searchParams: Promise<{ page?: string }>
}) {
    const { countryCode } = await params
    const sp = await searchParams
    const page = Math.max(1, parseInt(sp.page || "1", 10) || 1)
    const limit = 10
    const offset = (page - 1) * limit

    const { posts, count } = await listBlogPosts({ limit, offset })
    const totalPages = Math.max(1, Math.ceil(count / limit))

    const featured = page === 1 ? posts[0] : undefined
    const rest = featured ? posts.slice(1) : posts

    return (
        <main className="min-h-screen bg-gray-50 pb-24 relative overflow-hidden">
            {/* Dekoratif Arkaplan Küreleri */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>
            <div className="absolute top-[20%] right-[-10%] w-[30%] h-[40%] bg-purple-400 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>

            {/* Hero Bölümü */}
            <header className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center animate-fade-in-up z-10">
                <span className="inline-block px-5 py-2 rounded-full glass-panel text-[var(--ag-primary)] text-xs font-bold uppercase tracking-[0.2em] mb-6 shadow-sm">
                    GÜNCEL YAZILAR
                </span>
                <h1 className="text-5xl md:text-7xl font-heading font-bold text-gray-900 tracking-tight mb-6">
                    İlham & Keşif
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto font-light leading-relaxed">
                    Sektörel trendler, yapay zeka entegrasyonları ve işinize değer katacak profesyonel analizler.
                </p>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {posts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 px-4 bg-white/50 backdrop-blur-xl rounded-3xl border border-gray-100 shadow-sm text-center">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-4xl">📝</div>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Henüz yazı yok</h2>
                        <p className="text-gray-500">Çok yakında değerli içeriklerle karşınızda olacağız.</p>
                    </div>
                ) : (
                    <>
                        {/* Öne Çıkan Yazı */}
                        {featured && (
                            <Link
                                href={`/${countryCode}/blog/${featured.slug}`}
                                className="group block mb-16 relative bg-white rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-700 hover:-translate-y-2 border border-gray-100 overflow-hidden"
                            >
                                <div className="flex flex-col lg:flex-row">
                                    <div className="w-full lg:w-3/5 relative aspect-video lg:aspect-auto min-h-[300px] lg:min-h-[500px] overflow-hidden bg-gray-100">
                                        {featured.thumbnail ? (
                                            <Image
                                                src={featured.thumbnail}
                                                alt={featured.title}
                                                fill
                                                priority
                                                sizes="(max-width: 1024px) 100vw, 60vw"
                                                className="object-cover transition-transform duration-1000 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                                                <span className="text-8xl font-heading font-bold text-black/10">
                                                    {featured.title.charAt(0)}
                                                </span>
                                            </div>
                                        )}
                                        {/* Overlay Gradient */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 lg:opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    </div>
                                    
                                    <div className="w-full lg:w-2/5 p-8 lg:p-16 flex flex-col justify-center relative bg-white">
                                        <div className="flex items-center gap-3 mb-6">
                                            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                                                ÖNE ÇIKAN
                                            </span>
                                            {featured.ai_generated && (
                                                <span className="flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-widest text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
                                                    <Sparkles size={12} /> AI Destekli
                                                </span>
                                            )}
                                        </div>
                                        
                                        <h2 className="text-3xl lg:text-4xl font-heading font-bold text-gray-900 mb-6 leading-tight group-hover:text-blue-600 transition-colors">
                                            {featured.title}
                                        </h2>
                                        
                                        {featured.excerpt && (
                                            <p className="text-gray-600 text-lg mb-8 line-clamp-3 leading-relaxed">
                                                {featured.excerpt}
                                            </p>
                                        )}
                                        
                                        <div className="mt-auto flex items-center justify-between text-sm font-medium">
                                            <span className="text-gray-400">{formatBlogDate(featured.published_at)}</span>
                                            <span className="flex items-center gap-2 text-blue-600 font-semibold group-hover:gap-3 transition-all">
                                                Hemen Oku <ArrowRight size={18} />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )}

                        {/* Diğer Yazılar Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {rest.map((post) => (
                                <Link
                                    key={post.id}
                                    href={`/${countryCode}/blog/${post.slug}`}
                                    className="group flex flex-col bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border border-gray-100"
                                >
                                    <div className="relative aspect-video overflow-hidden bg-gray-100">
                                        {post.thumbnail ? (
                                            <Image
                                                src={post.thumbnail}
                                                alt={post.title}
                                                fill
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200">
                                                <span className="text-6xl font-heading font-bold text-black/5">
                                                    {post.title.charAt(0)}
                                                </span>
                                            </div>
                                        )}
                                        
                                        {post.ai_generated && (
                                            <div className="absolute top-4 left-4 glass-panel bg-white/80 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                                <Sparkles size={12} className="text-purple-600" />
                                                <span className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-900">AI</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="p-8 flex flex-col flex-grow relative">
                                        <h3 className="text-xl font-heading font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                            {post.title}
                                        </h3>
                                        {post.excerpt && (
                                            <p className="text-gray-500 text-sm mb-6 line-clamp-2 leading-relaxed flex-grow">
                                                {post.excerpt}
                                            </p>
                                        )}
                                        <div className="mt-auto flex items-center justify-between text-sm font-medium pt-6 border-t border-gray-50">
                                            <span className="text-gray-400">{formatBlogDate(post.published_at)}</span>
                                            <span className="text-blue-600 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                                <ArrowRight size={18} />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <nav className="flex items-center justify-center gap-4 mt-20">
                                {page > 1 ? (
                                    <Link 
                                        href={`/${countryCode}/blog?page=${page - 1}`} 
                                        className="px-6 py-3 rounded-full bg-white shadow-sm hover:shadow-md border border-gray-200 text-gray-700 font-medium transition-all"
                                    >
                                        ← Önceki
                                    </Link>
                                ) : (
                                    <span className="px-6 py-3 rounded-full bg-gray-50 border border-gray-100 text-gray-400 font-medium cursor-not-allowed">
                                        ← Önceki
                                    </span>
                                )}
                                
                                <span className="font-semibold text-gray-900 mx-4">
                                    {page} / {totalPages}
                                </span>
                                
                                {page < totalPages ? (
                                    <Link 
                                        href={`/${countryCode}/blog?page=${page + 1}`} 
                                        className="px-6 py-3 rounded-full bg-white shadow-sm hover:shadow-md border border-gray-200 text-gray-700 font-medium transition-all"
                                    >
                                        Sonraki →
                                    </Link>
                                ) : (
                                    <span className="px-6 py-3 rounded-full bg-gray-50 border border-gray-100 text-gray-400 font-medium cursor-not-allowed">
                                        Sonraki →
                                    </span>
                                )}
                            </nav>
                        )}
                    </>
                )}
            </div>
        </main>
    )
}
