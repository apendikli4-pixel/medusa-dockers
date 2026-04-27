import type { RedisClientType } from "redis";
import { createClient } from "redis";
import logger from "../logger";

/**
 * Redis Client Singleton
 *
 * Connection pooling and automatic reconnection handled by ioredis.
 * URL from REDIS_URL env var, defaults to redis://localhost:6379
 */
const redisClient: RedisClientType = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
    // Optional: enable Lua scripts for atomic operations if needed
    // enableOfflineQueue: false,
});

redisClient.on("error", (err) => {
    logger.error(`Redis connection error: ${err.message}`);
});

redisClient.on("connect", () => {
    logger.debug("Redis client connected");
});

redisClient.on("ready", () => {
    logger.debug("Redis client ready");
});

redisClient.on("end", () => {
    logger.warn("Redis client disconnected");
});

/**
 * Initialize and connect to Redis.
 * Call this during app startup (e.g., medusa-config or main entry).
 */
export async function initRedis(): Promise<void> {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
}

/**
 * Get the connected Redis client instance.
 */
export function getRedisClient(): RedisClientType {
    if (!redisClient.isOpen) {
        throw new Error("Redis client not initialized. Call initRedis() first.");
    }
    return redisClient;
}

export default redisClient;
