import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getBlogPost, listBlogPosts, formatBlogDate } from "@/lib/server/blog"
import { markdownToHtml } from "@/lib/markdown"

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

    const html = markdownToHtml(post.content)

    // İlgili yazılar (kendisi hariç ilk 3)
    const { posts } = await listBlogPosts({ limit: 4 })
    const related = posts.filter((p) => p.slug !== slug).slice(0, 3)

    return (
        <main className="ag-article-page">
            <article className="ag-article">
                <Link href={`/${countryCode}/blog`} className="ag-back">
                    ← Tüm yazılar
                </Link>

                <header className="ag-article-header">
                    <span className="ag-blog-kicker">{formatBlogDate(post.published_at)}</span>
                    <h1>{post.title}</h1>
                    {post.excerpt && <p className="ag-article-excerpt">{post.excerpt}</p>}
                    <div className="ag-article-divider" />
                </header>

                {post.thumbnail && (
                    <div className="ag-article-cover">
                        <Image
                            src={post.thumbnail}
                            alt={post.title}
                            fill
                            sizes="(max-width: 900px) 100vw, 800px"
                            className="ag-article-cover-img"
                            priority
                        />
                    </div>
                )}

                <div
                    className="ag-article-body"
                    dangerouslySetInnerHTML={{ __html: html }}
                />

                {post.ai_generated && (
                    <p className="ag-article-aino">
                        ✦ Bu içerik yapay zeka desteğiyle hazırlanmış, editör onayından geçmiştir.
                    </p>
                )}
            </article>

            {related.length > 0 && (
                <aside className="ag-article-related">
                    <h2>İlgili Yazılar</h2>
                    <div className="ag-blog-grid">
                        {related.map((p) => (
                            <Link
                                key={p.id}
                                href={`/${countryCode}/blog/${p.slug}`}
                                className="ag-blog-card"
                            >
                                <div className="ag-blog-card-media">
                                    {p.thumbnail ? (
                                        <Image src={p.thumbnail} alt={p.title} fill sizes="33vw" className="ag-blog-card-img" />
                                    ) : (
                                        <div className="ag-blog-ph">{p.title.charAt(0).toUpperCase()}</div>
                                    )}
                                </div>
                                <div className="ag-blog-card-body">
                                    <h3>{p.title}</h3>
                                    <div className="ag-blog-meta">
                                        <span>{formatBlogDate(p.published_at)}</span>
                                        <span className="ag-blog-readmore">Oku →</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </aside>
            )}
        </main>
    )
}
