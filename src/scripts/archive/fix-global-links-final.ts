
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function fixGlobalLinksFinal({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const query = container.resolve("query")
    const remoteLink = container.resolve("remoteLink")

    logger.info("🛠️  [FIX - FINAL] Global Region-Fulfillment Linking...")

    try {
        // 1. Bölgeleri al
        const { data: regions } = await query.graph({
            entity: "region",
            fields: ["id", "name"]
        })
        
        // 2. Sevkiyat Setlerini al
        const { data: sets } = await query.graph({
            entity: "fulfillment_set",
            fields: ["id", "name"]
        })

        if (sets.length === 0) {
            logger.error("❌ Sevkiyat seti bulunamadı!")
            return
        }

        const fSet = sets[0] // İlk seti kullan veya isme göre bul
        logger.info(`🚚 Kullanılan Sevkiyat Seti: ${fSet.name} (${fSet.id})`)

        for (const region of regions) {
            logger.info(`📍 Bölge İşleniyor: ${region.name} (${region.id})`)
            
            // Bağlantı kur
            await remoteLink.create({
                [Modules.REGION]: { region_id: region.id },
                [Modules.FULFILLMENT]: { fulfillment_set_id: fSet.id }
            })
            logger.info(`   - ✅ ${region.name} bağlantısı kuruldu.`)
        }

        logger.info("✨ Tüm bölgeler için bağlantılar tamamlandı!")

    } catch (e: any) {
        logger.error("❌ Onarım başarısız: " + e.message)
        console.error(e)
    }
}
