import { MetadataRoute } from 'next'
import { listBlogPosts } from '@/lib/server/blog'
import { getBaseUrl } from '@/lib/server/base-url'
import { retrieveCurrentTenant } from '@/lib/server/tenant'

// Build sırasında backend'e gidilmesin; sitemap çalışma anında üretilir.
export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Çoklu mağaza: her mağazanın sitemap'i KENDİ host'u ve KENDİ blog yazılarıyla
  // üretilir (host istekten türetilir, tek env değil).
  const baseUrl = await getBaseUrl()
  let locale = "tr"
  try {
    const tenant = await retrieveCurrentTenant()
    locale = tenant?.storefront?.commerce?.locale || "tr"
  } catch { /* tenant çözülemezse tr */ }

  const entries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'yearly', priority: 1 },
    { url: `${baseUrl}/${locale}`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/${locale}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
  ]

  // Blog yazılarını dinamik ekle (SEO indexleme) — listBlogPosts tenant-aware.
  try {
    const { posts } = await listBlogPosts({ limit: 200 })
    for (const post of posts) {
      entries.push({
        url: `${baseUrl}/${locale}/blog/${post.slug}`,
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
