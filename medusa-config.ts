import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import path from "path"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

// Üretim ortamında zayıf default secretlere izin verme
if (process.env.NODE_ENV === "production") {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "supersecret") {
        throw new Error("GÜVENLIK HATASI: Üretimde JWT_SECRET ortam değişkeni güçlü bir değerle set edilmelidir.")
    }
    if (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET === "supersecret") {
        throw new Error("GÜVENLIK HATASI: Üretimde COOKIE_SECRET ortam değişkeni güçlü bir değerle set edilmelidir.")
    }
}

export default defineConfig({
    projectConfig: {
        databaseUrl: process.env.DATABASE_URL,
        // ─── Redis HA Yapılandırması ───
        // Medusa V2 Durable Execution Engine tüm workflow durumlarını PostgreSQL'de tutar.
        // Redis sadece mesaj kuyruğu (queue) ve pub/sub olarak kullanılır.
        // Sentinel yapısı docker-compose.yml'de tanımlıdır.
        redisUrl: process.env.REDIS_URL,
        redisOptions: {
            // Bağlantı koptuğunda exponential backoff ile yeniden deneme
            retryStrategy(times: number): number | null {
                if (times > 20) {
                    // 20 denemeden sonra bağlantıyı bırak — Sentinel failover tamamlanmış olmalı
                    console.error(`[Redis] Max retry reached (${times}). Giving up.`)
                    return null
                }
                // Exponential backoff: 100ms, 200ms, 400ms, ... max 5s
                return Math.min(times * 100, 5000)
            },
            maxRetriesPerRequest: 3,        // Her istek için max 3 deneme
            connectTimeout: 10000,          // Bağlantı timeout: 10s
            commandTimeout: 5000,           // Komut timeout: 5s
            enableReadyCheck: true,         // Bağlantı hazır kontrolü
            lazyConnect: false,             // Hemen bağlan
        },
        workerMode: (process.env.MEDUSA_WORKER_MODE as "shared" | "worker" | "server") ?? "shared",
        http: {
            storeCors: process.env.STORE_CORS || "http://localhost:8000,http://localhost:3000",
            adminCors: process.env.ADMIN_CORS || "http://localhost:9000,http://localhost:5173",
            authCors: process.env.AUTH_CORS || "http://localhost:9000,http://localhost:8000",
            jwtSecret: process.env.JWT_SECRET || "supersecret",
            cookieSecret: process.env.COOKIE_SECRET || "supersecret",
        },
        databaseDriverOptions: {
            ssl: false,
        },
        // Meilisearch Integration (Peak Roadmap)
        // @ts-expect-error ProjectConfigOptions currently mismatch
        searchConfig: {
            meilisearch: {
                host: process.env.MEILISEARCH_HOST || "http://meilisearch:7700",
                apiKey: process.env.MEILISEARCH_API_KEY || "masterKey",
            },
        },
    },
    admin: {
        disable: false,
        backendUrl: process.env.MEDUSA_ADMIN_BACKEND_URL || "/",
    },
    modules: {
        eventBus: {
            resolve: "@medusajs/event-bus-redis",
            options: {
                redisUrl: process.env.REDIS_URL,
            },
        },
        cacheService: {
            resolve: "@medusajs/cache-redis",
            options: {
                redisUrl: process.env.REDIS_URL,
            },
        },
        file: {
            resolve: "@medusajs/file",
            options: {
                providers: [
                    {
                        resolve: "./src/providers/cloudinary",
                        id: "cloudinary",
                        options: {
                            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                            api_key: process.env.CLOUDINARY_API_KEY,
                            api_secret: process.env.CLOUDINARY_API_SECRET,
                        }
                    }
                ]
            },
        },
        ayna: {
            resolve: "./src/modules/ayna",
        },
        content_engine: {
            resolve: "./src/modules/content_engine",
        },
        conscience: {
            resolve: "./src/modules/conscience",
            options: {
                // Prompt injection detection settings
                injectionDetection: {
                    enabled: process.env.INJECTION_DETECTION_ENABLED !== "false",
                    riskThreshold: parseInt(process.env.INJECTION_RISK_THRESHOLD || "70", 10),
                    // Custom patterns to always block (in addition to built-in ones)
                    blockList: process.env.INJECTION_BLOCK_LIST?.split(",") || ["ignore previous", "system prompt", "forget all", "override instructions", "bypass rules"],
                    // Custom patterns to always allow (even if they match block patterns)
                    allowList: process.env.INJECTION_ALLOW_LIST?.split(",") || ["pool calculation", "chemical dose", "store policy"],
                }
            }
        },
        subscription: {
            resolve: "./src/modules/subscription",
        },
        loyalty: {
            resolve: "./src/modules/loyalty",
        },
        wishlist: {
            resolve: "./src/modules/wishlist",
        },
        tenant: {
            resolve: "./src/modules/tenant",
        },
        booking: {
            resolve: "./src/modules/booking",
        },
        blog: {
            resolve: "./src/modules/blog",
        },
        promotion: {
            resolve: "@medusajs/promotion",
            options: {},
        },
        notification: {
            resolve: "@medusajs/notification",
            options: {
                providers: [
                    {
                        resolve: "@medusajs/notification-local",
                        id: "local-notification-provider",
                        options: {
                            channels: ["email"],
                        },
                    },
                    {
                        resolve: "./src/providers/brevo",
                        id: "brevo",
                        options: {
                            api_key: process.env.BREVO_API_KEY,
                            from_email: process.env.BREVO_FROM_EMAIL || "donotreply@store.com",
                            from_name: process.env.BREVO_FROM_NAME || "Ayna Store",
                        },
                    }
                ],
            },
        },
        payment: {
            resolve: "@medusajs/payment",
            options: {
                providers: [
                    {
                        resolve: "./src/providers/manual",
                        id: "manual",
                        options: {}
                    },
                    {
                        resolve: "./src/providers/paytr",
                        id: "paytr",
                        options: {
                            merchant_id: process.env.PAYTR_MERCHANT_ID,
                            merchant_key: process.env.PAYTR_MERCHANT_KEY,
                            merchant_salt: process.env.PAYTR_MERCHANT_SALT,
                            debug: true,
                        }
                    },
                    {
                        resolve: "./src/providers/iyzico",
                        id: "iyzico",
                        options: {
                            api_key: process.env.IYZICO_API_KEY,
                            secret_key: process.env.IYZICO_SECRET_KEY,
                            base_url: process.env.IYZICO_BASE_URL,
                        }
                    }
                ]
            }
        },
        fulfillment: {
            resolve: "@medusajs/fulfillment",
            options: {
                providers: [
                    {
                        resolve: "@medusajs/fulfillment-manual",
                        id: "manual-fulfillment",
                        options: {}
                    },
                    {
                        resolve: "./src/providers/yurtici",
                        id: "yurtici",
                        options: {
                            apiKey: process.env.YURTICI_API_KEY,
                            apiSecret: process.env.YURTICI_API_SECRET
                        }
                    }
                ]
            }
        }
    },
})
