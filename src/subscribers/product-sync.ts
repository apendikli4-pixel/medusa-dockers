import { Modules } from "@medusajs/framework/utils"
import { MeiliSearch } from "meilisearch"

export default async function productSync({
    event: { data, name },
    container,
}: any) {
    const productService = container.resolve(Modules.PRODUCT)
    const logger = container.resolve("logger")

    const client = new MeiliSearch({
        host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
        apiKey: process.env.MEILISEARCH_MASTER_KEY || "masterKey123",
    })

    const index = client.index("products")

    try {
        if (name === "product.deleted") {
            await index.deleteDocument(data.id)
            logger.info(`Run 'product.deleted' subscription: Deleted product ${data.id} from Meilisearch`)
            return
        }

        // specific fields for search
        const product = await productService.retrieveProduct(data.id, {
            relations: ["categories", "variants", "options", "tags", "type", "collection"],
        })

        const document = {
            id: product.id,
            title: product.title,
            description: product.description,
            handle: product.handle,
            status: product.status,
            thumbnail: product.thumbnail,
            categories: product.categories?.map((c: any) => c.name) || [],
            tags: product.tags?.map((t: any) => t.value) || [],
            collection: product.collection?.title,
            type: product.type?.value,
            // Variant info for filtering/pricing display
            variants: product.variants?.map((v: any) => ({
                id: v.id,
                title: v.title,
                sku: v.sku,
                prices: v.prices // Note: prices might need further resolution depending on structure
            })) || [],
            updated_at: product.updated_at,
            created_at: product.created_at,
        }

        await index.updateDocuments([document])
        logger.info(`Run '${name}' subscription: Indexed product ${data.id} in Meilisearch`)
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error"
        logger.error(`Error in productSync subscriber: ${message}`)
    }
}

export const config = {
    event: ["product.created", "product.updated", "product.deleted"],
}
