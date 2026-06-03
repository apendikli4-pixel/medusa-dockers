import { model } from "@medusajs/framework/utils"

export const Page = model.define("page", {
    id: model.id().primaryKey(),
    title: model.text(),
    slug: model.text().unique(),
    content: model.text(), // Can hold HTML or Markdown
    seo_title: model.text().nullable(),
    seo_description: model.text().nullable(),
    status: model.enum(["draft", "published", "archived"]).default("draft").index(),
    view_count: model.number().default(0),
})
