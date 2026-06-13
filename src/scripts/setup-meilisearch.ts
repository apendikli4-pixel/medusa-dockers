import { ExecArgs } from "@medusajs/framework/types"
import { PRODUCT_INDEX, applyProductIndexSettings } from "../lib/search/product-index-settings"

/**
 * Meilisearch index ayarlarını (idempotent) kurar.
 *
 * Sorun: product-sync indexer dökümanlara `sales_channel_ids` yazıyor ama index'in
 * `filterableAttributes` listesi hiç tanımlanmamıştı. hybrid-search ise
 * `filter: sales_channel_ids = '...'` kullanıyor → Meili "attribute not filterable"
 * hatası verip aramayı BOŞ döndürüyordu (çoklu-mağaza izolasyonu da çalışmıyordu).
 *
 * Bu script "products" index'ini garanti eder ve filterable/searchable/sortable
 * alanlarını ayarlar. updateSettings idempotenttir (istenen durumu set eder).
 * start.sh'den her deploy'da çalışır (non-fatal).
 */
export default async function setupMeilisearch({ container }: ExecArgs) {
    const logger = container.resolve("logger") as any // audit-ignore: no-as-any (Medusa container resolve)

    const host = process.env.MEILISEARCH_HOST
    const apiKey = process.env.MEILISEARCH_MASTER_KEY
    if (!host || !apiKey) {
        logger.warn("[Meili Setup] MEILISEARCH_HOST/MASTER_KEY yok — atlanıyor.")
        return
    }

    try {
        const { MeiliSearch } = await import("meilisearch")
        const client = new MeiliSearch({ host, apiKey })

        // Index yoksa oluştur (varsa "already exists" hatasını yut).
        try {
            await client.createIndex(PRODUCT_INDEX, { primaryKey: "id" })
            logger.info("[Meili Setup] 'products' index oluşturuldu.")
        } catch {
            // zaten var — sorun değil
        }

        // Ayarlar tek doğruluk kaynağından uygulanır (Canlı Bütünlük Denetçisi onarıcısı da aynısını kullanır).
        await applyProductIndexSettings(client.index(PRODUCT_INDEX))

        logger.info("[Meili Setup] 'products' index ayarları uygulandı (filterable: sales_channel_ids vb.).")
    } catch (e: any) {
        logger.error(`[Meili Setup] Hata: ${e?.message || e}`)
    }
}
