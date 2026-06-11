import { MetadataRoute } from 'next'
import { getBaseUrl } from '@/lib/server/base-url'

// Çoklu mağaza: sitemap adresi istek host'undan türetilir (tek env değil).
export const dynamic = "force-dynamic"

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await getBaseUrl()

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/account/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
