/**
 * Medusa V2.15 — Tip Genişletme Notları (Declaration Merging)
 *
 * Medusa V2.15'te `@medusajs/framework/types`'tan export edilen `Logger`
 * arayüzü artık tek argümanlı imzaya çekildi (`info(message: string)`).
 * Ancak alttaki Pino logger gerçekte 2. argüman olarak context objesi de
 * kabul ediyor ve loglara metadata olarak ekliyor.
 *
 * Eski proje genelinde `logger.warn("msg", { key: val })` paterni yaygın.
 * Tip seviyesinde overload ekleyerek bu kullanımı korumayı tercih ediyoruz —
 * runtime davranışı değişmez, derleme yeşillenir.
 *
 * Aynı şekilde `MedusaRequest.auth_context` artık doğrudan tipte yok ama
 * runtime'da `authenticate(...)` middleware'inin çıkışı olarak set ediliyor.
 * Tip extension ile mevcut kullanımları kırmadan tip-güvenli kılıyoruz.
 *
 * Bu dosya sadece tip extension'ları içerir, runtime kod üretmez.
 */

import "@medusajs/framework/types"
import "@medusajs/framework/http"

declare module "@medusajs/framework/types" {
    /**
     * Eski projenin yaygın kullandığı 2-argümanlı log paterni için overload.
     * V2.15 strict tipi tek-arg, runtime Pino çift-arg destekler — bu overload
     * runtime davranışını DEĞİŞTİRMEZ, sadece tip kontrolünü uyumlu kılar.
     */
    interface Logger {
        info(message: string, context?: unknown): void
        warn(message: string, context?: unknown): void
        error(message: string, context?: unknown): void
        debug(message: string, context?: unknown): void
    }
}

declare module "@medusajs/framework/http" {
    /**
     * `authenticate(...)` middleware çalıştıktan sonra req'e enjekte edilen
     * actor bağlamı. Medusa V2.15'te bu alan tipte zorunlu olarak yok
     * (`authenticate` middleware'inin çalıştığı yerleri tipler bilmiyor),
     * ama runtime'da var. Bu extension mevcut kodla uyumluluk sağlar.
     */
    interface MedusaRequest {
        auth_context?: {
            actor_id?: string
            actor_type?: "admin" | "customer" | "user"
            app_metadata?: Record<string, unknown>
        }
    }
}
