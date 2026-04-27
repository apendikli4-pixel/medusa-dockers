import { SchemaType } from "@google/generative-ai"

export const conscienceTool = {
    name: "conscience_check",
    description: "Bir işlemin etik uygunluğunu değerlendirir. Stokta olmayan ürün önerme, fiyat manipülasyonu gibi durumları kontrol eder.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            action: {
                type: SchemaType.STRING,
                description: "Değerlendirilecek eylem açıklaması"
            },
            context: {
                type: SchemaType.STRING,
                description: "Eylemin bağlamı (JSON string olarak)"
            }
        },
        required: ["action", "context"]
    }
}
