import { SchemaType } from "./schema-types"

export const contentCreatorTool = {
    name: "create_blog_post",
    description: "Blog yazısı oluşturur ve yayınlar. SEO uyumlu içerik üretimi için kullanılır.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            title: {
                type: SchemaType.STRING,
                description: "Blog yazısı başlığı"
            },
            slug: {
                type: SchemaType.STRING,
                description: "URL-friendly slug (örn: havuz-bakimi-rehberi)"
            },
            content: {
                type: SchemaType.STRING,
                description: "Blog yazısı içeriği (HTML formatında)"
            },
            status: {
                type: SchemaType.STRING,
                description: "Yayın durumu: 'draft' veya 'published' (varsayılan: draft)"
            }
        },
        required: ["title", "slug", "content"]
    }
}
