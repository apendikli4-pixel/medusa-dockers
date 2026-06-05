import { SchemaType } from "./schema-types"

export const categoryTool = {
    name: "create_category",
    description: "Yeni bir ürün kategorisi oluşturur. (Sadece Admin)",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            name: {
                type: SchemaType.STRING,
                description: "Kategori adı"
            },
            handle: {
                type: SchemaType.STRING,
                description: "URL dostu uzantı (örn: havuz-aydinlatma)"
            },
            description: {
                type: SchemaType.STRING,
                description: "Kategori için SEO uyumlu, Google dostu ve bilgilendirici bir açıklama üret."
            }
        },
        required: ["name"]
    }
}
