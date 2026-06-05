import { SchemaType } from "./schema-types"

export const productSearchTool = {
    name: "search_products",
    description: "Ürün veritabanında arama yapar. Havuz kimyasalları, ekipmanları ve aksesuarları arar.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            query: {
                type: SchemaType.STRING,
                description: "Arama kelimesi (ürün adı, kategori vb.)"
            },
            limit: {
                type: SchemaType.NUMBER,
                description: "Sonuç limiti (varsayılan: 5)"
            }
        },
        required: ["query"]
    }
}
