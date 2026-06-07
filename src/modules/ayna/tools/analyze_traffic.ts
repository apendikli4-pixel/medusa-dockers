import { SchemaType } from "./schema-types"
import { ga4Service } from "../../../lib/analytics/ga4-service"

export const analyzeTrafficTool = {
    name: "analyze_traffic",
    description: "Google Analytics (GA4) verilerini kullanarak sitenin genel trafik durumunu ve en çok ziyaret edilen sayfalarını analiz eder. SEO, dönüşüm oranları veya trafik sorunlarını tespit etmek için kullanılmalıdır.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            days: {
                type: SchemaType.NUMBER,
                description: "Kaç günlük trafik verisinin analiz edileceği. Varsayılan: 7"
            }
        },
        required: []
    },
    // Not: Bu func Medusa'nın ana araç sistemi tarafından çağrıldığında
    // doğrudan tool-service üzerinden de çalıştırılabilir, ancak
    // bu sefer bağımsız bir servis (ga4Service) olduğu için doğrudan
    // handleToolCall içinde bu işlevi tetikleyeceğiz. 
}
