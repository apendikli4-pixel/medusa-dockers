
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector"
import { Embeddings } from "@langchain/core/embeddings"
import { Document } from "@langchain/core/documents"
import { PoolConfig } from "pg"
import { ollamaEmbed } from "../lib/ollama-client"

/**
 * OllamaEmbeddings — LangChain Embeddings arayüzünü Ollama (nomic-embed-text)
 * ile uygular. Gemini (GoogleGenerativeAIEmbeddings) kaldırıldı.
 */
class OllamaEmbeddings extends Embeddings {
    constructor() {
        super({})
    }
    async embedQuery(text: string): Promise<number[]> {
        return ollamaEmbed(text)
    }
    async embedDocuments(texts: string[]): Promise<number[][]> {
        const out: number[][] = []
        for (const t of texts) out.push(await ollamaEmbed(t))
        return out
    }
}

// Type definition for step input
type ProductInput = {
    id: string
    title: string
    description: string
    handle: string
    material?: string
}

// ADIM 1: Metni Vektöre Çevir (Embedding) - Ollama ile
const generateEmbeddingStep = createStep("generate-embedding", async (product: ProductInput, { container }) => {
    const textToEmbed = `
    Ürün: ${product.title}
    Açıklama: ${product.description || ''}
    Materyal: ${product.material || ''}
  `.trim()

    const embedding = await ollamaEmbed(textToEmbed)
    return new StepResponse(embedding)
})

// ADIM 2: Vektörü PGVector'a Yükle
const uploadToPgVectorStep = createStep("upload-pgvector", async (input: { id: string, title: string, handle: string, embedding: number[] }, { container }) => {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) return new StepResponse("skipped_no_config")

    try {
        const config = {
            postgresConnectionOptions: {
                connectionString: databaseUrl,
                ssl: false
            } as PoolConfig,
            tableName: "langchain_pg_embedding",
            columns: {
                idColumnName: "id",
                vectorColumnName: "embedding",
                contentColumnName: "text",
                metadataColumnName: "metadata",
            },
        }

        const embeddings = new OllamaEmbeddings()

        const vectorStore = await PGVectorStore.initialize(embeddings, config)

        // Belgeyi hazırlayalım
        const doc = new Document({
            pageContent: input.title,
            metadata: {
                product_id: input.id,
                title: input.title,
                handle: input.handle,
                type: "product",
                synced_at: new Date().toISOString()
            }
        })

        // Geçmiş vektörü ezmek için ürün id'si ile silelim (Eğer Langchain direct upsert desteklemiyorsa)
        // Ya da addDocuments metodunda kendi ürettiğimiz ID'leri atayalım. Langchain IDs destekler:
        await vectorStore.addDocuments([doc], { ids: [input.id] })

        return new StepResponse("success", input.id)
    } catch (error: any) {
        const logger = container.resolve("logger")
        logger.error(`[Workflow] PGVector Upload Error: ${error.message}`)
        throw error
    }
}, async (productId, { container }) => {
    // COMPENSATION: Rolback on error
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl || !productId) return

    try {
        const config = {
            postgresConnectionOptions: { connectionString: databaseUrl, ssl: false } as PoolConfig,
            tableName: "langchain_pg_embedding",
        }
        const embeddings = new OllamaEmbeddings()
        const store = await PGVectorStore.initialize(embeddings, config)
        const logger = container.resolve("logger")
        await store.delete({ ids: [productId] })
        logger.info(`[Workflow] Compensation: Deleted ${productId} from PGVector.`)
    } catch (e: any) {
        const logger = container.resolve("logger")
        logger.error(`[Workflow] Compensation Failed: ${e.message}`)
    }
})

// İŞ AKIŞINI TANIMLA
export const syncProductToVectorDb = createWorkflow("sync-product-vector", function (input: { product: ProductInput }) {
    const embedding = generateEmbeddingStep(input.product)

    uploadToPgVectorStep({
        id: input.product.id,
        title: input.product.title,
        handle: input.product.handle,
        embedding: embedding
    })

    return new WorkflowResponse("Product vector sync initiated")
})
