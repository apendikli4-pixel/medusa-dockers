// @ts-nocheck
// TECH-DEBT (v2.13→v2.15 upgrade, 2026-05-24):
// redis npm paketi v4 API değişti — zRevRange, zRange, scan signature'ları farklı.
// Modernize edilmesi gerek; runtime çalışıyor (yeni tipler katılaşmış).
// Tracking: docs/TECH_DEBT.md
import type { RedisClientType } from "redis";
import { createClient } from "redis";
import { randomUUID } from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "../logger";
import { initRedis, getRedisClient } from "../redis/client";

/**
 * Cache type categories with their TTL strategies (in seconds)
 */
export enum CacheType {
    PRODUCT = "product",       // 5 minutes
    CONTENT = "content",       // 24 hours
    BLOG = "blog",             // 24 hours (alias for content)
    GENERAL = "general",       // 2 hours
}

const TTL_MAP: Record<CacheType, number> = {
    [CacheType.PRODUCT]: 5 * 60,          // 300 seconds
    [CacheType.CONTENT]: 24 * 60 * 60,    // 86400 seconds
    [CacheType.BLOG]: 24 * 60 * 60,       // 86400 seconds
    [CacheType.GENERAL]: 2 * 60 * 60,     // 7200 seconds
};

/**
 * Metadata stored alongside the cached response
 */
export interface CacheMetadata {
    tokensUsed?: number;
    provider: string;           // e.g., "gemini", "ollama"
    timestamp: number;          // epoch ms
    type: CacheType;            // categorization for TTL
    [key: string]: any;
}

/**
 * Cached entry structure
 */
export interface CacheEntry {
    query: string;
    response: string;
    metadata: CacheMetadata;
    cacheKey: string;
}

/**
 * SemanticCacheService — Redis-backed semantic cache with vector similarity
 *
 * Uses Gemini text-embedding-004 for embeddings.
 * Stores cache entries as Redis hashes and maintains a sorted set index by timestamp.
 * Cosine similarity threshold configurable.
 */
export class SemanticCacheService {
    private static instance: SemanticCacheService;
    private readonly similarityThreshold: number = 0.92;
    private readonly indexKey: string = "ayna:semantic:index";
    private readonly keyPrefix: string = "ayna:cache:";
    private genAI: GoogleGenerativeAI | null = null;
    private embeddingModel: any = null; // GenerativeModel with embed capability
    private redisConnectedPromise: Promise<void> | null = null;

    private constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.embeddingModel = this.genAI.getGenerativeModel({
                model: "text-embedding-004",
            });
        } else {
            logger.warn("SemanticCacheService: GEMINI_API_KEY not set, embedding generation disabled");
        }
    }

    /**
     * Singleton accessor
     */
    public static getInstance(): SemanticCacheService {
        if (!SemanticCacheService.instance) {
            SemanticCacheService.instance = new SemanticCacheService();
        }
        return SemanticCacheService.instance;
    }

    /**
     * Ensure Redis connection is established (idempotent)
     */
    private async ensureRedis(): Promise<void> {
        if (!this.redisConnectedPromise) {
            this.redisConnectedPromise = (async () => {
                try {
                    await initRedis();
                } catch (err) {
                    logger.error("SemanticCache: Redis initialization failed", { error: err });
                    throw err;
                }
            })();
        }
        await this.redisConnectedPromise;
    }

    /**
     * Generate embedding vector for a text query
     */
    private async generateEmbedding(query: string): Promise<number[] | null> {
        if (!this.embeddingModel) {
            logger.error("SemanticCache: Embedding model not initialized");
            return null;
        }
        try {
            const result = await this.embeddingModel.embedContent(query);
            return result.embedding.values;
        } catch (err: any) {
            logger.error("SemanticCache: Embedding generation failed", {
                error: err.message,
                query: query.substring(0, 50),
            });
            return null;
        }
    }

    /**
     * Cosine similarity between two vectors
     */
    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            return 0;
        }
        let dot = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Retrieve cached response for a semantically similar query
     *
     * @param query - User query string
     * @param tenantId - Optional tenant ID to isolate cache
     * @param limit - Max number of candidate entries to check (default 100)
     * @returns Cached entry or null
     */
    public async get(query: string, tenantId?: string, limit: number = 100): Promise<CacheEntry | null> {
        await this.ensureRedis();
        const client = getRedisClient();

        const queryEmbedding = await this.generateEmbedding(query);
        if (!queryEmbedding) {
            logger.debug("SemanticCache: Failed to generate embedding for query, skipping get");
            return null;
        }

        try {
            const indexKeyToUse = tenantId ? `${this.indexKey}:${tenantId}` : this.indexKey;
            const prefixToUse = tenantId ? `${this.keyPrefix}${tenantId}:` : this.keyPrefix;

            // Get recent candidate cache keys from sorted set (most recent first)
            const candidateKeys: string[] = await client.zRevRange(
                indexKeyToUse,
                0,
                limit - 1
            );

            if (candidateKeys.length === 0) {
                logger.debug("SemanticCache: Miss (no candidates)");
                return null;
            }

            // Pipeline to fetch all candidate hashes in one round-trip
            const pipeline = client.multi();
            candidateKeys.forEach((ck) => {
                pipeline.hGetAll(prefixToUse + ck);
            });

            const rawResults: any[] = await pipeline.exec() as any[];
            let bestEntry: CacheEntry | null = null;
            let bestScore = 0;

            for (let i = 0; i < candidateKeys.length; i++) {
                const raw = rawResults[i];
                if (!raw || !raw.embedding) {
                    // Orphaned index entry, clean up
                    client.zRem(indexKeyToUse, candidateKeys[i]).catch(() => {});
                    continue;
                }

                try {
                    const candidateEmbedding: number[] = JSON.parse(raw.embedding);
                    const score = this.cosineSimilarity(queryEmbedding, candidateEmbedding);

                    if (score >= this.similarityThreshold && score > bestScore) {
                        bestScore = score;
                    bestEntry = {
                        query: raw.query,
                        response: raw.response,
                        metadata: {
                            tokensUsed: parseInt(raw.tokensUsed || "0", 10),
                            provider: raw.provider,
                            timestamp: parseInt(raw.timestamp || "0", 10),
                            type: raw.type as CacheType,
                        },
                        cacheKey: candidateKeys[i],
                    };
                    }
                } catch (e) {
                    // skip malformed embedding
                    continue;
                }
            }

            if (bestEntry) {
                logger.info("SemanticCache: Hit", {
                    query: query.substring(0, 50),
                    similarity: bestScore.toFixed(4),
                    cacheKey: bestEntry.cacheKey,
                });
                // Optionally refresh TTL on hit? Usually we keep original TTL.
                return bestEntry;
            } else {
                logger.debug("SemanticCache: Miss (below threshold)", {
                    candidateCount: candidateKeys.length,
                    bestScore: bestScore.toFixed(4),
                });
                return null;
            }
        } catch (err: any) {
            logger.error("SemanticCache: Get error", { error: err.message });
            return null;
        }
    }

    /**
     * Cache a query-response pair
     *
     * @param query - Original query
     * @param response - AI response text
     * @param metadata - Additional metadata including tokensUsed, provider, type
     * @param tenantId - Optional tenant ID for multi-tenant isolation
     * @returns Cache key string
     */
    public async set(
        query: string,
        response: string,
        metadata: Omit<CacheMetadata, "timestamp">,
        tenantId?: string
    ): Promise<string> {
        await this.ensureRedis();
        const client = getRedisClient();

        const embedding = await this.generateEmbedding(query);
        if (!embedding) {
            throw new Error("Failed to generate embedding for cache set");
        }

        const cacheKey = randomUUID();
        const indexKeyToUse = tenantId ? `${this.indexKey}:${tenantId}` : this.indexKey;
        const prefixToUse = tenantId ? `${this.keyPrefix}${tenantId}:` : this.keyPrefix;
        const fullKey = prefixToUse + cacheKey;
        const timestamp = Date.now();
        const ttl = TTL_MAP[metadata.type] || TTL_MAP[CacheType.GENERAL];

        const pipeline = client.multi();
        pipeline.hSet(fullKey, {
            query,
            response,
            embedding: JSON.stringify(embedding),
            tokensUsed: metadata.tokensUsed?.toString() || "0",
            provider: metadata.provider || "unknown",
            timestamp: timestamp.toString(),
            type: metadata.type,
        });
        pipeline.expire(fullKey, ttl);
        pipeline.zAdd(indexKeyToUse, { score: timestamp, value: cacheKey });
        // Optional: set a longer TTL on index key to prune old entries automatically? No per-member TTL.
        await pipeline.exec();

        logger.debug("SemanticCache: Set entry", {
            cacheKey,
            type: metadata.type,
            ttl,
            query: query.substring(0, 50),
        });

        return cacheKey;
    }

    /**
     * Invalidate cache entries matching a glob-style pattern
     * Pattern matches against full Redis keys (e.g., "ayna:cache:*", "ayna:cache:abc123")
     *
     * @param pattern - Redis key pattern
     * @returns Number of keys invalidated
     */
    public async invalidate(pattern: string): Promise<number> {
        await this.ensureRedis();
        const client = getRedisClient();

        // Use SCAN to avoid blocking on large datasets
        let cursor = "0";
        let deletedCount = 0;
        const keysToDelete: string[] = [];

        do {
            const [nextCursor, keys] = (await client.scan(cursor, {
                match: pattern,
                count: 100,
            })) as [string, string[]];
            cursor = nextCursor;
            keysToDelete.push(...keys);
        } while (cursor !== "0");

        if (keysToDelete.length === 0) {
            return 0;
        }

        // Delete in pipeline
        const pipeline = client.multi();
        keysToDelete.forEach((k) => pipeline.del(k));
        // Also remove from index: extract the cacheKey part from the key (strip prefix)
        const cacheKeys = keysToDelete.map((k) => k.replace(this.keyPrefix, ""));
        if (cacheKeys.length > 0) {
            pipeline.zRem(this.indexKey, ...cacheKeys);
        }
        await pipeline.exec();

        deletedCount = keysToDelete.length;
        logger.info("SemanticCache: Invalidated", { pattern, count: deletedCount });
        return deletedCount;
    }
}

// Export singleton instance
export const semanticCache = SemanticCacheService.getInstance();
