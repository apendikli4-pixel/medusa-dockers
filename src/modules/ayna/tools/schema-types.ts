/**
 * SchemaType — yerel tool şema tip sabitleri.
 *
 * Önceden `@google/generative-ai`'den import ediliyordu. Gemini tamamen
 * kaldırıldığı için (açık kaynak/Ollama'ya geçiş), o pakete bağımlılığı
 * koparmak adına aynı enum değerleri burada yeniden tanımlandı.
 *
 * Değerler JSON Schema tip adlarıyla uyumludur (string, object, number...);
 * Ollama function-calling ve genel araç şeması için yeterlidir.
 */
export const SchemaType = {
    STRING: "string",
    NUMBER: "number",
    INTEGER: "integer",
    BOOLEAN: "boolean",
    ARRAY: "array",
    OBJECT: "object",
} as const

export type SchemaType = (typeof SchemaType)[keyof typeof SchemaType]

export default SchemaType
