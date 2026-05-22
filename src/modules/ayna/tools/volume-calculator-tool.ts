import { SchemaType } from "@google/generative-ai"

/**
 * Generic Dimension & Volume Calculator Tool
 * Sektör bağımsız (boya, fayans, iklimlendirme, havuz vs.) kullanılabilir.
 */
export const volumeCalculatorTool = {
    name: "volumeCalculator",
    description: "Mekansal veya hacimsel hesaplamalar yapar. Müşterinin verdiği ölçülere göre alan (m2) veya hacim (m3) hesaplayarak ürün ihtiyacını belirler.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            calculationType: {
                type: SchemaType.STRING,
                description: "Hesaplama tipi ('alan', 'hacim', 'boya_ihtiyaci', 'fayans_ihtiyaci', 'kimyasal_ihtiyaci')",
                enum: ["alan", "hacim", "boya_ihtiyaci", "fayans_ihtiyaci", "kimyasal_ihtiyaci"]
            },
            length: {
                type: SchemaType.NUMBER,
                description: "Uzunluk (metre). Müşteri belirttiyse doldur."
            },
            width: {
                type: SchemaType.NUMBER,
                description: "Genişlik (metre). Müşteri belirttiyse doldur."
            },
            height_or_depth: {
                type: SchemaType.NUMBER,
                description: "Yükseklik veya Derinlik (metre). Hacim hesaplanacaksa doldur."
            },
            coverage_per_unit: {
                type: SchemaType.NUMBER,
                description: "1 birim ürünün kapladığı alan veya etki ettiği hacim (örn: 1 kutu boya 15m2 boyar ise 15)."
            }
        },
        required: ["calculationType"]
    }
}
