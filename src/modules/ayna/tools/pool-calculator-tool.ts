import { SchemaType } from "@google/generative-ai"

/**
 * Havuz kimyasal hesaplama aracı — Gemini native FunctionDeclaration formatı
 * Eski: src/lib/agents/pool-calculator.ts (LangChain DynamicTool) — kaldırıldı
 */
export const poolCalculatorTool = {
    name: "calculatePoolChemicals",
    description: "Havuz hacmine göre gereken kimyasal miktarını hesaplar. Müşteri havuzun en, boy ve derinliğini verirse önce hacmi hesapla, sonra kimyasal miktarını döndür.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            chemicalType: {
                type: SchemaType.STRING,
                description: "Hesaplanacak kimyasal türü ('klor', 'ph_dusurucu', 'ph_arttirici')",
                enum: ["klor", "ph_dusurucu", "ph_arttirici"]
            },
            volume: {
                type: SchemaType.NUMBER,
                description: "Havuz hacmi (m3). Müşteri hacmi verdiyse doldur, aksi halde boş bırak."
            },
            length: {
                type: SchemaType.NUMBER,
                description: "Havuz uzunluğu (metre). Müşteri belirttiyse doldur."
            },
            width: {
                type: SchemaType.NUMBER,
                description: "Havuz genişliği (metre). Müşteri belirttiyse doldur."
            },
            depth: {
                type: SchemaType.NUMBER,
                description: "Havuz derinliği (metre). Müşteri belirttiyse doldur."
            },
            location: {
                type: SchemaType.STRING,
                description: "Havuz konumu (İç mekan/Dış mekan)"
            },
            poolType: {
                type: SchemaType.STRING,
                description: "Havuz kullanım tipi (Standart/Yoğun/Otel)"
            }
        },
        required: ["chemicalType"]
    }
}
