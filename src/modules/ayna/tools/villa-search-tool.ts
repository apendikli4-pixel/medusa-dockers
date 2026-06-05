import { SchemaType } from "./schema-types"

/**
 * Villa Search Tool
 * Sadece 'villa' sektöründe veya genel rezervasyon modunda kullanılır.
 * Müşterinin istediği tarihler arasında müsait olan villaları bulur.
 */
export const villaSearchTool = {
    name: "searchAvailableVillas",
    description: "Villa kiralama mağazaları için müsaitlik arama aracı. Müşterinin girdiği giriş ve çıkış tarihleri arasında rezervasyonu olmayan, boş ve müsait villaları bulur.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            start_date: {
                type: SchemaType.STRING,
                description: "Müşterinin villaya giriş yapacağı tarih (YYYY-MM-DD formatında). Örn: '2026-07-15'"
            },
            end_date: {
                type: SchemaType.STRING,
                description: "Müşterinin villadan çıkış yapacağı tarih (YYYY-MM-DD formatında). Örn: '2026-07-22'"
            },
            location: {
                type: SchemaType.STRING,
                description: "İsteğe bağlı. Aranan villanın bulunduğu şehir veya bölge. Örn: 'Antalya', 'Kaş', 'Fethiye'"
            },
            capacity: {
                type: SchemaType.NUMBER,
                description: "İsteğe bağlı. Villada kalacak kişi sayısı. Örn: 4, 6, 8"
            }
        },
        required: ["start_date", "end_date"]
    }
}
