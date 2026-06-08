import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getBlogPost, listBlogPosts, formatBlogDate } from "@/lib/server/blog"
import { renderContent } from "@/lib/markdown"
import { Sparkles, ArrowLeft, ArrowRight, Share2 } from "lucide-react"

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>
}): Promise<Metadata> {
    const { slug } = await params
    const post = await getBlogPost(slug)
    if (!post) return { title: "Yazı bulunamadı" }
    return {
        title: post.seo_title || post.title,
        description: post.seo_description || post.excerpt || "",
        keywords: post.keywords || undefined,
        openGraph: {
            title: post.seo_title || post.title,
            description: post.seo_description || post.excerpt || "",
            type: "article",
            images: post.thumbnail ? [{ url: post.thumbnail }] : undefined,
        },
    }
}

export default async function BlogDetailPage({
    params,
}: {
    params: Promise<{ countryCode: string; slug: string }>
}) {
    const { countryCode, slug } = await params
    const post = await getBlogPost(slug)
    if (!post) notFound()

    const html = renderContent(post.content)

    // İlgili yazılar (kendisi hariç ilk 3)
    const { posts } = await listBlogPosts({ limit: 4 })
    const related = posts.filter((p) => p.slug !== slug).slice(0, 3)

    return (
        <main className="bg-white min-h-screen">
            <article className="relative">
                {/* Header/Hero Section */}
                <header className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 text-center animate-fade-in-up">
                    <Link 
                        href={`/${countryCode}/blog`} 
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors mb-12"
                    >
                        <ArrowLeft size={16} /> Tüm Yazılara Dön
                    </Link>
                    
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <span className="text-gray-400 font-medium tracking-wide">
                            {formatBlogDate(post.published_at)}
                        </span>
                        {post.ai_generated && (
                            <>
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full">
                                    <Sparkles size={14} /> AI Editör
                                </span>
                            </>
                        )}
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-gray-900 tracking-tight leading-tight mb-8">
                        {post.title}
                    </h1>
                    
                    {post.excerpt && (
                        <p className="text-xl md:text-2xl text-gray-500 font-light max-w-3xl mx-auto leading-relaxed">
                            {post.excerpt}
                        </p>
                    )}
                </header>

                {/* Hero Image */}
                {post.thumbnail && (
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <div className="relative aspect-video w-full rounded-[2rem] overflow-hidden shadow-2xl">
                            <Image
                                src={post.thumbnail}
                                alt={post.title}
                                fill
                                sizes="(max-width: 1200px) 100vw, 1200px"
                                className="object-cover"
                                priority
                            />
                        </div>
                    </div>
                )}

                {/* Article Body */}
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                    <div
                        className="prose prose-lg md:prose-xl prose-blue mx-auto prose-headings:font-heading prose-headings:font-bold prose-p:text-gray-600 prose-p:leading-relaxed prose-a:text-blue-600 prose-img:rounded-2xl prose-img:shadow-lg"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                    
                    {post.ai_generated && (
                        <div className="mt-16 p-6 bg-purple-50 rounded-2xl border border-purple-100 flex items-start gap-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm text-purple-600">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-purple-900 mb-1">Ayna AI İçerik Motoru</h4>
                                <p className="text-sm text-purple-700 leading-relaxed">
                                    Bu içerik, platformumuzun yapay zeka asistanı tarafından sektörel veriler analiz edilerek 
                                    hazırlanmış ve editöryal doğrulama sürecinden geçerek yayına alınmıştır.
                                </p>
                            </div>
                        </div>
                    )}
                    
                    <div className="mt-16 pt-8 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex gap-4">
                            <span className="font-semibold text-gray-900">Paylaş:</span>
                            <button className="text-gray-400 hover:text-blue-600 transition-colors"><Share2 size={20} /></button>
                        </div>
                    </div>
                </div>
            </article>

            {/* İlgili Yazılar */}
            {related.length > 0 && (
                <aside className="bg-gray-50 py-24 border-t border-gray-100">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-end justify-between mb-12">
                            <div>
                                <h2 className="text-3xl font-heading font-bold text-gray-900 mb-4">Sizin İçin Seçtiklerimiz</h2>
                                <p className="text-gray-500 text-lg">Bu konuyu sevdiyseniz, şu yazılara da göz atmalısınız.</p>
                            </div>
                            <Link href={`/${countryCode}/blog`} className="hidden md:flex items-center gap-2 text-blue-600 font-semibold hover:gap-3 transition-all">
                                Tüm Blog <ArrowRight size={20} />
                            </Link>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {related.map((p) => (
                                <Link
                                    key={p.id}
                                    href={`/${countryCode}/blog/${p.slug}`}
                                    className="group flex flex-col bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border border-gray-100"
                                >
                                    <div className="relative aspect-video overflow-hidden bg-gray-100">
                                        {p.thumbnail ? (
                                            <Image 
                                                src={p.thumbnail} 
                                                alt={p.title} 
                                                fill 
                                                sizes="(max-width: 768px) 100vw, 33vw" 
                                                className="object-cover transition-transform duration-700 group-hover:scale-110" 
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200">
                                                <span className="text-6xl font-heading font-bold text-black/5">
                                                    {p.title.charAt(0)}
                                                </span>
                                            </div>
                                        )}
                                        
                                        {p.ai_generated && (
                                            <div className="absolute top-4 left-4 glass-panel bg-white/80 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                                <Sparkles size={12} className="text-purple-600" />
                                                <span className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-900">AI</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-8 flex flex-col flex-grow">
                                        <h3 className="text-xl font-heading font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                            {p.title}
                                        </h3>
                                        <div className="mt-auto flex items-center justify-between text-sm font-medium pt-6 border-t border-gray-50">
                                            <span className="text-gray-400">{formatBlogDate(p.published_at)}</span>
                                            <span className="text-blue-600 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                                <ArrowRight size={18} />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                        
                        <div className="mt-12 text-center md:hidden">
                            <Link href={`/${countryCode}/blog`} className="inline-flex items-center justify-center w-full px-6 py-4 bg-white border border-gray-200 rounded-xl font-semibold text-gray-900 shadow-sm">
                                Tüm Blog Yazıları
                            </Link>
                        </div>
                    </div>
                </aside>
            )}
        </main>
    )
}
