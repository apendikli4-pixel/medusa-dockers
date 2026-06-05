import { SchemaType } from "./schema-types"

export const inventoryCheckTool = {
    name: "check_inventory",
    description: "Bir ürünün stok durumunu kontrol eder. Stokta kaç adet olduğunu, depo bilgisini döndürür.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            productId: {
                type: SchemaType.STRING,
                description: "Kontrol edilecek ürünün ID'si"
            }
        },
        required: ["productId"]
    }
}
