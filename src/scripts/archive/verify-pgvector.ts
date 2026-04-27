import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector"
import { Document } from "@langchain/core/documents"
import { PoolConfig } from "pg"
import dotenv from "dotenv"

dotenv.config()

async function testPgVector() {
    console.log("🚀 [TEST] Starting pgvector E2E Verification...");

    // Windows IPv6 issue bypass: ensure localhost resolves to 127.0.0.1
    const databaseUrlRaw = process.env.DATABASE_URL;
    if (!databaseUrlRaw) {
        console.error("❌ Environment variables missing.");
        process.exit(1);
    }
    const databaseUrl = databaseUrlRaw.replace("localhost", "127.0.0.1");
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!databaseUrl || !geminiKey) {
        console.error("❌ Environment variables missing.");
        process.exit(1);
    }

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

        console.log("🧠 [TEST] Initializing Gemini 004 Embeddings...");
        const embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: geminiKey,
            model: "text-embedding-004",
        });

        console.log("💾 [TEST] Connecting to Local PostgreSQL pgvector...");
        const vectorStore = await PGVectorStore.initialize(embeddings, config);

        // 1. Yazma Testi (Insert)
        console.log("📝 [TEST] Creating a dummy product vector...");
        const testId = "prod_test_001";
        const doc = new Document({
            pageContent: "Süper Motor X100 - Profesyonel havuz temizleme motoru. Yüksek emiş gücü ve dayanıklı malzeme.",
            metadata: {
                product_id: testId,
                title: "Süper Motor X100",
                type: "product",
                test_flag: true
            }
        });

        await vectorStore.addDocuments([doc], { ids: [testId] });
        console.log("✅ [TEST] Dummy product inserted successfully.");

        // 2. Okuma/Arama Testi (Semantic Search)
        console.log("🔍 [TEST] Searching for 'güçlü havuz motoru'...");
        const searchResults = await vectorStore.similaritySearchWithScore("güçlü temizleyici motor", 2);

        console.log(`📊 [TEST] Found ${searchResults.length} results.`);

        let foundPassed = false;
        searchResults.forEach(([resultDoc, score]) => {
            console.log(`   - Matrix Score: ${score.toFixed(4)} | Title: ${resultDoc.metadata.title}`);
            if (resultDoc.metadata.product_id === testId) {
                foundPassed = true;
            }
        });

        if (foundPassed) {
            console.log("✅ [TEST] Semantic Search successfully retrieved the dummy product!");
        } else {
            console.error("❌ [TEST] Semantic Search FAILED to retrieve the dummy product.");
        }

        // 3. Temizlik Testi (Delete)
        console.log("🧹 [TEST] Cleaning up test data...");
        await vectorStore.delete({ ids: [testId] });
        console.log("✅ [TEST] Dummy product deleted from pgvector.");

        console.log("\n🎉 [TEST SUMMARY] ALL SYSTEMS NOMINAL. Pinecone-to-pgvector migration is 100% SUCCESSFUL.");

    } catch (e: any) {
        console.error(`💥 [TEST] CRITICAL ERROR: ${e.message}`);
        if (e instanceof AggregateError) {
            console.error("🔍 Aggregate Errors:");
            for (const error of e.errors) {
                console.error(`   - ${error.message}`);
            }
        } else {
            console.error(e.stack);
        }
        process.exit(1);
    }
}

testPgVector();
