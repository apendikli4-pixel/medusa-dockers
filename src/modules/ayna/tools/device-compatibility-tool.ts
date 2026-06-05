import { SchemaType } from "./schema-types"

/**
 * Device Compatibility Tool
 * Sadece 'electronics' (elektronik/teknoloji) sektöründeki mağazalarda yapay zekaya yüklenir.
 * Müşterilere aksesuar, kılıf veya yedek parçanın cihazlarıyla uyumlu olup olmadığını kontrol etme imkanı sunar.
 */
export const deviceCompatibilityTool = {
    name: "deviceCompatibility",
    description: "Elektronik mağazaları için cihaz uyumluluk kontrol aracı. Bir aksesuarın (kılıf, şarj aleti, batarya vb.) müşterinin cihazıyla tam uyumlu çalışıp çalışmayacağını kontrol etmek için kullanılır.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            accessory_type: {
                type: SchemaType.STRING,
                description: "Aksesuar veya parçanın türü. Örn: 'kılıf', 'şarj kablosu', 'batarya', 'ekran koruyucu'."
            },
            customer_device_model: {
                type: SchemaType.STRING,
                description: "Müşterinin sahip olduğu cihazın marka ve modeli. Örn: 'iPhone 16 Pro Max', 'Samsung Galaxy S24 Ultra'."
            },
            product_handle_or_id: {
                type: SchemaType.STRING,
                description: "Mağazadaki ürünün ID'si veya handle değeri (Eğer müşteri belirli bir ürünü soruyorsa)."
            }
        },
        required: ["accessory_type", "customer_device_model"]
    }
}
