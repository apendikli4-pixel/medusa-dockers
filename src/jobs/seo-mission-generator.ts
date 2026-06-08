import { MedusaContainer } from "@medusajs/framework/types"
import { ga4Service } from "../lib/analytics/ga4-service"
import AynaService from "../modules/ayna/service"

export default async function seoMissionGeneratorJob(container: MedusaContainer) {
    const logger = container.resolve("logger") as any
    const aynaService = container.resolve("ayna") as AynaService

    logger.info("[SEO Mission Job] Ayna AI Otonom SEO stratejisi analizine başlıyor...")

    try {
        // 1. GA4'ten en düşük performans gösteren (veya genel) sayfaları al
        const topPages = await ga4Service.getTopPages(7, 20)
        
        if (!topPages || topPages.length === 0) {
            logger.info("[SEO Mission Job] GA4 verisi alınamadı veya liste boş.")
            return
        }

        // 2. Kasıtlı olarak listeyi ters çevirip trafiği 'düşmeye başlayan' veya 
        // daha az ziyaret edilen ürünleri bulalım ki SEO dopingi yapalım.
        const lowTrafficPages = topPages.filter(p => p.pagePath.includes('/products/')).reverse()
        
        if (lowTrafficPages.length === 0) {
            logger.info("[SEO Mission Job] SEO optimizasyonu gerektiren düşük trafikli ürün sayfası bulunamadı.")
            return
        }

        const targetPage = lowTrafficPages[0]
        logger.info(`[SEO Mission Job] Hedef SEO Sayfası Seçildi: ${targetPage.pageTitle} (${targetPage.views} görüntülenme)`)

        // 3. Ayna'ya yeni bir 'Görev (Mission)' oluştur
        const missionPrompt = `
Sistem yöneticisi adına otomatik bir SEO iyileştirme görevi oluşturuyorsun.
Aşağıdaki ürünün son 7 gündeki sayfa görüntülenmesi sadece ${targetPage.views} oldu.
Lütfen 'create_mission' aracını kullanarak bu ürün için bir SEO makalesi yazılması veya
açıklamasının zenginleştirilmesi için bir onay görevi (Mission) oluştur.

Ürün Yolu: ${targetPage.pagePath}
Ürün Başlığı: ${targetPage.pageTitle}

Önemli: result_intent_action alanına 'generate_seo_blog' yazabilirsin.
`
        // Ayna'yı admin modunda tetikle (Otonom işlem)
        // İmza: processMessage(message, options)
        await aynaService.processMessage(
            missionPrompt,
            { isAdmin: true, tenantSector: "retail" } as any // Admin yetkisiyle araçları kullanabilsin
        )

        logger.info(`[SEO Mission Job] '${targetPage.pageTitle}' için Ayna AI Mission başarıyla oluşturuldu. Admin onayını bekliyor.`)

    } catch (err: any) {
        logger.error(`[SEO Mission Job] Çalışma sırasında hata oluştu: ${err.message}`)
    }
}

export const config = {
    name: "ayna-seo-mission-generator",
    schedule: "0 2 * * 1", // Her Pazartesi gece saat 02:00'de çalışır
}
