import { SchemaType } from "@google/generative-ai"

export const inventoryManagerTool = {
    name: "manage_inventory",
    description: "Stok miktarını ve fiyatını günceller. SADECE Admin modunda kullanılabilir.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            productId: {
                type: SchemaType.STRING,
                description: "Güncellenecek ürünün ID'si"
            },
            action: {
                type: SchemaType.STRING,
                description: "Yapılacak işlem: 'update_stock' (stok adedi) veya 'update_price' (fiyat). Fiyat güncellenirken TRY para birimi esas alınır."
            },
            value: {
                type: SchemaType.NUMBER,
                description: "Yeni sayısal değer. Stok için tam sayı, fiyat için kuruşsuz (örn: 1500) değer girilmelidir."
            }
        },
        required: ["productId", "action", "value"]
    }
}
