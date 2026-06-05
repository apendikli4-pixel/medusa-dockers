import { SchemaType } from "./schema-types"

export const inventoryManagerTool = {
    name: "manage_inventory",
    description: "Stok miktarını veya fiyatını günceller. SADECE Admin modunda kullanılabilir. Fiyat güncelleme doğrudan veritabanındaki price_set üzerinden yapılır.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            productId: {
                type: SchemaType.STRING,
                description: "Güncellenecek ürünün ID'si (product_xxxxx formatında)"
            },
            action: {
                type: SchemaType.STRING,
                description: "Yapılacak işlem: 'update_stock' (stok adedi güncelle) veya 'update_price' (TRY fiyatı güncelle)"
            },
            value: {
                type: SchemaType.NUMBER,
                description: "Yeni sayısal değer. Stok için tam sayı (örn: 50), fiyat için TL cinsinden tam değer (örn: 1500 = 1500 TL)"
            }
        },
        required: ["productId", "action", "value"]
    }
}
