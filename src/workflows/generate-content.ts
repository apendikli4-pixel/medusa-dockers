import {
    createWorkflow,
    createStep,
    StepResponse,
    WorkflowResponse
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { CONTENT_ENGINE_MODULE } from "../modules/content_engine"
import { GoogleGenerativeAI } from "@google/generative-ai"

import { AI_CONFIG } from "../lib/ai-config"

// =============================================================================
// ADIM 1: Ürün Verisini Çek
// =============================================================================
const getProductStep = createStep(
    "get-product-for-content",
    async (input: { productId: string }, { container }) => {
        const productModule = container.resolve(Modules.PRODUCT) as any
        const product = await productModule.retrieveProduct(input.productId)
        return new StepResponse(product)
    }
)

// =============================================================================
// ADIM 2: GERÇEK YAPAY ZEKA (GEMINI) İLE İÇERİK ÜRET
// =============================================================================
const generateAIContentStep = createStep(
    "generate-ai-content",
    async (product: any, { container }) => {
        const apiKey = process.env.GEMINI_API_KEY

        if (!apiKey) {
            throw new Error("MİMARİ HATA: GEMINI_API_KEY .env dosyasında bulunamadı!")
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const modelName = AI_CONFIG.geminiModel
        const model = genAI.getGenerativeModel({ model: modelName })

        // Zekaya verilecek emir (Prompt Engineering)
        const prompt = `
            Sen profesyonel bir SEO uzmanı ve metin yazarısın.
            Aşağıdaki ürün için Türkçe, satış odaklı bir blog yazısı hazırla.
            
            Ürün Adı: ${product.title}
            Ürün Açıklaması (Varsa): ${product.description || "Bu harika bir ürün."}
            
            Lütfen yanıtı SADECE geçerli bir JSON formatında ver. Başka hiçbir metin ekleme.
            JSON Formatı şöyle olmalı:
            {
                "title": "Çarpıcı bir başlık",
                "slug": "url-dostu-slug",
                "content": "HTML formatında zengin içerik (p, h2, ul etiketleri kullan)",
                "status": "published"
            }
        `

        try {
            const result = await model.generateContent(prompt)
            const response = await result.response
            const text = response.text()

            // JSON temizliği (Bazen AI markdown ```json ... ``` ekler, onu temizleyelim)
            const cleanJson = text.replace(/```json|```/g, "").trim()
            const aiData = JSON.parse(cleanJson)

            return new StepResponse(aiData)

        } catch (error) {
            console.error("Yapay Zeka Krizi:", error)
            // Fallback (Yedek Plan): Eğer AI çökerse sistemi durdurma, manuel taslak oluştur.
            return new StepResponse({
                title: `${product.title} (Taslak)`,
                slug: `${product.handle}-taslak`,
                content: "<p>Yapay zeka bağlantısında sorun oluştu. Lütfen manuel düzenleyin.</p>",
                status: "draft"
            })
        }
    }
)

// =============================================================================
// ADIM 3: İçeriği Veritabanına Kaydet
// =============================================================================
const createPostStep = createStep(
    "create-post-from-ai",
    async (input: any, { container }) => {
        const contentModule = container.resolve(CONTENT_ENGINE_MODULE) as any
        // Slug çakışmasını önlemek için timestamp ekle
        const finalSlug = `${input.slug}-${Date.now()}`

        const post = await contentModule.createPosts({
            ...input,
            slug: finalSlug
        })
        return new StepResponse(post, post.id)
    },
    async (postId, { container }) => {
        if (!postId) return
        const contentModule = container.resolve(CONTENT_ENGINE_MODULE) as any
        await contentModule.deletePosts([postId])
    }
)

// =============================================================================
// WORKFLOW ORKESTRASYONU
// =============================================================================
export const generateContentWorkflow = createWorkflow(
    "generate-seo-post-workflow",
    (input: { productId: string }) => {
        const product = getProductStep({ productId: input.productId })
        const generatedData = generateAIContentStep(product)
        const post = createPostStep(generatedData)
        return new WorkflowResponse(post)
    }
)

export default generateContentWorkflow
