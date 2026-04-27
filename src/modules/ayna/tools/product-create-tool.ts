import { SchemaType } from "@google/generative-ai"

export const productCreateTool = {
    name: "create_product",
    description: "Yeni bir ürün oluşturur. (Sadece Admin)",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            title: {
                type: SchemaType.STRING,
                description: "Ürün başlığı"
            },
            handle: {
                type: SchemaType.STRING,
                description: "URL uzantısı"
            },
            description: {
                type: SchemaType.STRING,
                description: "Ürün için Google dostu, SEO uyumlu ve ikna edici bir açıklama üret."
            },
            categories: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
                description: "Kategori ID'leri"
            },
            sales_channels: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
                description: "Satış kanalı ID'leri (isteğe bağlı)"
            },
            price: {
                type: SchemaType.NUMBER,
                description: "Ürün fiyatı (Varsayılan para birimi)"
            }
        },
        required: ["title", "description"]
    }
}
