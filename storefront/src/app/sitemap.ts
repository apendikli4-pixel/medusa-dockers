import { MetadataRoute } from 'next'
import { listBlogPosts } from '@/lib/server/blog'

// Build sırasında backend'e gidilmesin; sitemap çalışma anında üretilir.
export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8000'

  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'yearly', priority: 1 },
    { url: `${baseUrl}/tr`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/tr/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
  ]

  // Blog yazılarını dinamik ekle (SEO indexleme)
  try {
    const { posts } = await listBlogPosts({ limit: 200 })
    for (const post of posts) {
      entries.push({
        url: `${baseUrl}/tr/blog/${post.slug}`,
        lastModified: post.published_at ? new Date(post.published_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
  } catch {
    // backend erişilemezse sadece statik girdiler döner
  }

  return entries
}
