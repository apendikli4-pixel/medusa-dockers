import { SchemaType } from "./schema-types"

export const createMissionTool = {
    name: "create_mission",
    description: "Admin onayına sunulacak yeni bir otonom sistem görevi (Mission) oluşturur. Sadece kritik bir iyileştirme veya stok uyarısı gibi insan onayı gerektiren işlemlerde kullanılmalıdır. Sadece adminler içindir.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            title: {
                type: SchemaType.STRING,
                description: "Görevin çok kısa, anlaşılır başlığı. Örn: 'Akvaryum Filtresi Stok Uyarısı'"
            },
            description: {
                type: SchemaType.STRING,
                description: "Görevin detaylı açıklaması ve sistemin yapması gereken işlem. Neden bu görev oluşturuldu?"
            },
            priority: {
                type: SchemaType.STRING,
                description: "Görevin öncelik seviyesi (low, medium, high, critical)"
            },
            result_intent_action: {
                type: SchemaType.STRING,
                description: "Görev onaylandığında çalıştırılacak otonom işlemi belirleyen makine-okunabilir niyet eylemi. Örn: 'restock_item'"
            },
            result_intent_payload: {
                type: SchemaType.STRING,
                description: "Niyetin argümanları JSON string formatında. Örn: '{\"product_id\": \"prod_123\"}'"
            }
        },
        required: ["title", "description", "priority", "result_intent_action"]
    }
}
