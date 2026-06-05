import { SchemaType } from "./schema-types"

export const campaignTool = {
    name: "create_campaign",
    description: "Yeni bir indirim veya kampanya oluşturur. SADECE Admin modunda kullanılabilir.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            campaign_name: {
                type: SchemaType.STRING,
                description: "Kampanya adı (örn: Yaz İndirimi)"
            },
            discount_amount: {
                type: SchemaType.NUMBER,
                description: "İndirim miktarı (yüzde veya sabit tutar)"
            }
        },
        required: ["campaign_name", "discount_amount"]
    }
}
