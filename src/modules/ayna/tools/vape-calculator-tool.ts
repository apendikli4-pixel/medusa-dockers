import { SchemaType } from "./schema-types"

/**
 * Vape Calculator Tool
 * Sadece 'vape' sektöründeki mağazalarda yapay zekaya yüklenir.
 * Müşterilere likit karışımı, nikotin (mg) ayarlama ve coil (ohm) tavsiyesi verir.
 */
export const vapeCalculatorTool = {
    name: "vapeCalculator",
    description: "Vape (Elektronik Sigara) mağazaları için özel hesaplama aracı. Müşterinin istediği nikotin oranını tutturmak için ne kadar NBase veya Nic-Shot (Booster) eklemesi gerektiğini hesaplar.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            target_nicotine_mg: {
                type: SchemaType.NUMBER,
                description: "Müşterinin hedeflediği nikotin oranı (mg/ml cinsinden). Örn: 3, 6, 9, 12."
            },
            total_liquid_ml: {
                type: SchemaType.NUMBER,
                description: "Yapılacak olan toplam likit miktarı (ml). Örn: 60, 120."
            },
            booster_nicotine_mg: {
                type: SchemaType.NUMBER,
                description: "Kullanılacak olan Nicotine Shot (Booster) içindeki nikotin miktarı (mg/ml). Genelde 18 veya 20 olur."
            }
        },
        required: ["target_nicotine_mg", "total_liquid_ml", "booster_nicotine_mg"]
    }
}
