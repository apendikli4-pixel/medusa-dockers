import { SchemaType } from "@google/generative-ai"

/**
 * Size Guide Tool
 * Sadece 'fashion' (giyim/moda) sektöründeki mağazalarda yapay zekaya yüklenir.
 * Müşterilere boy, kilo ve kalıp tercihlerine göre beden tavsiyesi verir.
 */
export const sizeGuideTool = {
    name: "sizeGuide",
    description: "Moda ve giyim mağazaları için beden rehberi aracı. Müşterinin boy, kilo ve kalıp (dar/oversize vb.) tercihlerine göre en uygun bedeni hesaplayıp döndürür.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            height_cm: {
                type: SchemaType.NUMBER,
                description: "Müşterinin boy uzunluğu (cm cinsinden). Örn: 175, 182."
            },
            weight_kg: {
                type: SchemaType.NUMBER,
                description: "Müşterinin kilosu (kg cinsinden). Örn: 70, 85."
            },
            fit_preference: {
                type: SchemaType.STRING,
                description: "Müşterinin kalıp tercihi. Değerler şunlardan biri olabilir: 'slim' (dar), 'regular' (normal), 'oversize' (geniş/bol)."
            },
            gender: {
                type: SchemaType.STRING,
                description: "Müşterinin cinsiyeti (isteğe bağlı). 'erkek', 'kadin' veya 'unisex'."
            }
        },
        required: ["height_cm", "weight_kg", "fit_preference"]
    }
}
