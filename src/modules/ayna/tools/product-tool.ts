import { SchemaType } from "./schema-types"

export const productSearchTool = {
    name: "search_products",
    // Sektör adı GEÇMEZ: bu araç tüm mağazalara yüklenir; açıklamada "havuz" gibi
    // bir sektör anılırsa model başka sektörün mağazasında kendini o sektörün
    // uzmanı sanır (Vozol'da havuz uzmanlığı iddiası hatasının köklerinden biri).
    description: "Bu mağazanın ürün kataloğunda arama yapar (ürün adı, kategori, anahtar kelime).",
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
