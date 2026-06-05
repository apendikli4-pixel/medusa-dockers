import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { listBlogPosts, formatBlogDate } from "@/lib/server/blog"

export const metadata: Metadata = {
    title: "Blog",
    description: "Uzman içerikler, bakım rehberleri ve sektörel ipuçları.",
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
    const limit = 9
    const offset = (page - 1) * limit

    const { posts, count } = await listBlogPosts({ limit, offset })
    const totalPages = Math.max(1, Math.ceil(count / limit))

    const featured = page === 1 ? posts[0] : undefined
    const rest = featured ? posts.slice(1) : posts

    return (
        <main className="ag-blog-page">
            {/* Hero başlık */}
            <header className="ag-blog-hero">
                <span className="ag-blog-kicker">YAZILAR</span>
                <h1>Blog</h1>
                <p>Uzman rehberler, bakım ipuçları ve sektörel içerikler.</p>
            </header>

            {posts.length === 0 ? (
                <div className="ag-empty">
                    <p>Henüz yayınlanmış bir yazı yok.</p>
                    <p className="ag-empty-hint">Yakında değerli içeriklerle buradayız.</p>
                </div>
            ) : (
                <>
                    {/* Öne çıkan yazı (ilk sayfa, ilk yazı) */}
                    {featured && (
                        <Link
                            href={`/${countryCode}/blog/${featured.slug}`}
                            className="ag-blog-featured"
                        >
                            <div className="ag-blog-featured-media">
                                {featured.thumbnail ? (
                                    <Image
                                        src={featured.thumbnail}
                                        alt={featured.title}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 60vw"
                                        className="ag-blog-featured-img"
                                    />
                                ) : (
                                    <div className="ag-blog-ph ag-blog-ph-lg">
                                        {featured.title.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="ag-blog-featured-body">
                                <span className="ag-blog-badge">Öne Çıkan</span>
                                <h2>{featured.title}</h2>
                                {featured.excerpt && <p>{featured.excerpt}</p>}
                                <div className="ag-blog-meta">
                                    <span>{formatBlogDate(featured.published_at)}</span>
                                    <span className="ag-blog-readmore">Devamını oku →</span>
                                </div>
                            </div>
                        </Link>
                    )}

                    {/* Grid */}
                    <div className="ag-blog-grid">
                        {rest.map((post) => (
                            <Link
                                key={post.id}
                                href={`/${countryCode}/blog/${post.slug}`}
                                className="ag-blog-card"
                            >
                                <div className="ag-blog-card-media">
                                    {post.thumbnail ? (
                                        <Image
                                            src={post.thumbnail}
                                            alt={post.title}
                                            fill
                                            sizes="(max-width: 768px) 100vw, 33vw"
                                            className="ag-blog-card-img"
                                        />
                                    ) : (
                                        <div className="ag-blog-ph">
                                            {post.title.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="ag-blog-card-body">
                                    <h3>{post.title}</h3>
                                    {post.excerpt && <p>{post.excerpt}</p>}
                                    <div className="ag-blog-meta">
                                        <span>{formatBlogDate(post.published_at)}</span>
                                        <span className="ag-blog-readmore">Oku →</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Sayfalama */}
                    {totalPages > 1 && (
                        <nav className="ag-pagination">
                            {page > 1 && (
                                <Link href={`/${countryCode}/blog?page=${page - 1}`} className="ag-link">
                                    ← Önceki
                                </Link>
                            )}
                            <span>Sayfa {page} / {totalPages}</span>
                            {page < totalPages && (
                                <Link href={`/${countryCode}/blog?page=${page + 1}`} className="ag-link">
                                    Sonraki →
                                </Link>
                            )}
                        </nav>
                    )}
                </>
            )}
        </main>
    )
}
