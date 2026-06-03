import { model } from "@medusajs/framework/utils"

/**
 * BlogPost — SEO odaklı blog yazısı.
 *
 * AI (Ayna) ile başlıktan üretilen içerik burada saklanır.
 * status="published" olanlar storefront'ta görünür.
 * tenant_id ile çok-mağazalı izolasyon (her mağaza kendi bloglarını yönetir).
 */
export const BlogPost = model.define("blog_post", {
    id: model.id().primaryKey(),
    // URL slug — benzersiz, storefront route'u (/blog/[slug])
    slug: model.text().unique(),
    title: model.text(),
    // Kısa özet (liste kartlarında + meta description fallback)
    excerpt: model.text().nullable(),
    // Asıl içerik (markdown)
    content: model.text(),
    // SEO meta alanları
    seo_title: model.text().nullable(),
    seo_description: model.text().nullable(),
    keywords: model.json().nullable(), // string[]
    // Kapak görseli URL
    thumbnail: model.text().nullable(),
    // generating | draft | published
    status: model.enum(["generating", "draft", "published"]).default("draft"),
    // Çok-mağaza izolasyonu (opsiyonel — tek mağaza modunda null)
    tenant_id: model.text().nullable(),
    // İçeriğin AI ile mi üretildiği (dürüstlük ilkesi — şeffaflık)
    ai_generated: model.boolean().default(false),
    published_at: model.dateTime().nullable(),
    metadata: model.json().nullable(),
})

export default BlogPost
