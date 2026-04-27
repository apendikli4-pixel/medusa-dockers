import { SchemaType } from "@google/generative-ai"

export const quickOrderTool = {
    name: "quick_order",
    description: "Belirtilen üründen hızlı bir şekilde sipariş oluşturur veya sepete ekler. Kullanıcı 'X ürününden al' dediğinde kullanılır.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            variant_id: {
                type: SchemaType.STRING,
                description: "Ürünün varyant ID'si (opsiyonel)"
            },
            quantity: {
                type: SchemaType.NUMBER,
                description: "Adet (varsayılan: 1)"
            },
            notes: {
                type: SchemaType.STRING,
                description: "Sipariş notu (varsayılan: 'Ayna Quick Order')"
            }
        },
        required: ["variant_id"]
    }
}
