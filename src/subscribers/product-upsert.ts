import { Modules } from "@medusajs/framework/utils"
import { syncProductToVectorDb } from "../workflows/sync-product-vector"

export default async function productUpsertHandler({
    event: { data },
    container,
}: any) {

    const logger = container.resolve("logger")
    try {
        // Ürün verisinin detaylarını çekmek için Product Module'ü kullanıyoruz
        const productModuleService = container.resolve(Modules.PRODUCT)
        const product = await productModuleService.retrieveProduct(data.id)

        logger.info(`[Ayna-Otonom] Ürün güncellendi/oluşturuldu: ${product.title} (${data.id}). Vektörleşme başlıyor...`)

        // İş akışını çalıştır
        await syncProductToVectorDb(container).run({
            input: {
                product: {
                    id: product.id,
                    title: product.title,
                    description: product.description || "",
                    handle: product.handle,
                    material: (product as any).metadata?.material || ""
                }
            }
        })

        logger.info(`[Ayna-Otonom] ✅ Ürün ${data.id} başarıyla vektörleştirildi ve pgvector'a yüklendi.`)
    } catch (error: any) {
        logger.error(`[Ayna-Otonom] ❌ Ürün vektörleştirme hatası (${data.id}): ${error.message}`)
    }
}

export const config = {
    event: ["product.created", "product.updated"],
}
