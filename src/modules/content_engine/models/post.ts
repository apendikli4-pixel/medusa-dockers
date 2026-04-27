import { model } from "@medusajs/framework/utils"

export const Post = model.define("post", {
    id: model.id().primaryKey(),
    title: model.text(),
    slug: model.text().unique(),
    content: model.text(),
    image: model.text().nullable(),
    metadata: model.json().nullable(),
    status: model.enum(["draft", "published", "archived"]).default("draft").index(),
    published_at: model.dateTime().index().nullable(),
    ai_score: model.number().nullable(),
    // SEO Fields
    author: model.text().nullable(),
    excerpt: model.text().nullable(),
    seo_title: model.text().nullable(),
    seo_description: model.text().nullable(),
    view_count: model.number().default(0),
})
