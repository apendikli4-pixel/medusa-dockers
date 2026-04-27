
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector"
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"
import { Document } from "@langchain/core/documents"
import { PoolConfig } from "pg"

// Type definition for step input
type ProductInput = {
    id: string
    title: string
    description: string
    handle: string
    material?: string
}

// ADIM 1: Metni Vektöre Çevir (Embedding) - Gemini ile
const generateEmbeddingStep = createStep("generate-embedding", async (product: ProductInput, { container }) => {
    // Access env via process (standard in Node) or config if needed. 
    // Using process.env is fine in recent Medusa v2 if properly loaded.
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing in environment variables")
    }

    const genAI = new GoogleGenerativeAI(apiKey)

    // Bağlam oluştur
    const textToEmbed = `
    Ürün: ${product.title}
    Açıklama: ${product.description || ''}
    Materyal: ${product.material || ''}
  `.trim()

    // Gemini text-embedding-004 modeli
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" })
    const result = await model.embedContent(textToEmbed)
    const embedding = result.embedding

    return new StepResponse(embedding.values)
})

// ADIM 2: Vektörü PGVector'a Yükle
const uploadToPgVectorStep = createStep("upload-pgvector", async (input: { id: string, title: string, handle: string, embedding: number[] }, { container }) => {
    const databaseUrl = process.env.DATABASE_URL
    const geminiKey = process.env.GEMINI_API_KEY
    if (!databaseUrl || !geminiKey) return new StepResponse("skipped_no_config")

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

        const embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: geminiKey,
            model: "text-embedding-004",
        })

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
        const embeddings = new GoogleGenerativeAIEmbeddings({ apiKey: process.env.GEMINI_API_KEY })
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
