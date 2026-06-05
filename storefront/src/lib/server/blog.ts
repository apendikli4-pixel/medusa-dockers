/**
 * Blog helper — server-side.
 *
 * Backend'in /store/blog ve /store/blog/:slug endpoint'lerini çağırır.
 * Yalnızca yayınlanmış (published) yazıları döner.
 */
import "server-only"
import { headers } from "next/headers"

const BACKEND_URL =
    process.env.MEDUSA_BACKEND_URL ||
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
    "http://localhost:9000"
const PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
    process.env.MEDUSA_PUBLISHABLE_KEY ||
    ""

export type BlogPostSummary = {
    id: string
    slug: string
    title: string
    excerpt: string | null
    thumbnail: string | null
    published_at: string | null
    ai_generated: boolean
}

export type BlogPostDetail = BlogPostSummary & {
    content: string
    seo_title: string | null
    seo_description: string | null
    keywords: string[] | null
}

async function tenantHeaders(): Promise<Record<string, string>> {
    const hdrs = await headers()
    const tenantSlug = hdrs.get("x-tenant-slug") || "default"
    return {
        "x-publishable-api-key": PUBLISHABLE_KEY,
        "x-tenant-slug": tenantSlug,
    }
}

/**
 * Yayınlanmış blog yazılarını listeler.
 * Hata olursa boş liste döner (sayfa "henüz yazı yok" gösterir).
 */
export async function listBlogPosts(opts?: {
    limit?: number
    offset?: number
}): Promise<{ posts: BlogPostSummary[]; count: number }> {
    try {
        const limit = opts?.limit ?? 20
        const offset = opts?.offset ?? 0
        const res = await fetch(
            `${BACKEND_URL}/store/blog?limit=${limit}&offset=${offset}`,
            {
                headers: await tenantHeaders(),
                next: { revalidate: 60, tags: ["blog"] },
            }
        )
        if (!res.ok) return { posts: [], count: 0 }
        const json = (await res.json()) as { posts?: BlogPostSummary[]; count?: number }
        return { posts: json.posts ?? [], count: json.count ?? 0 }
    } catch {
        return { posts: [], count: 0 }
    }
}

/**
 * Tek bir yayınlanmış blog yazısını slug ile getirir.
 * Bulunamazsa null döner.
 */
export async function getBlogPost(slug: string): Promise<BlogPostDetail | null> {
    try {
        const res = await fetch(
            `${BACKEND_URL}/store/blog/${encodeURIComponent(slug)}`,
            {
                headers: await tenantHeaders(),
                next: { revalidate: 60, tags: [`blog:${slug}`] },
            }
        )
        if (!res.ok) return null
        const json = (await res.json()) as { post?: BlogPostDetail }
        return json.post ?? null
    } catch {
        return null
    }
}

/** ISO tarihi Türkçe okunur formata çevirir. */
export function formatBlogDate(iso: string | null): string {
    if (!iso) return ""
    try {
        return new Date(iso).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
        })
    } catch {
        return ""
    }
}
