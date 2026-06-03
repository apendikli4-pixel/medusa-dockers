/**
 * reset-admin-password.ts — Admin şifresini güvenli şekilde sıfırlar.
 *
 * Medusa V2 auth modülünün updateProvider metodunu kullanır (scrypt hash
 * otomatik üretilir — manuel hash YAZMAYIZ, kırılgan ve hataya açık).
 *
 * Çalıştırma:
 *   docker exec medusa_server_core_v2 npx medusa exec ./src/scripts/reset-admin-password.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

const ADMIN_EMAIL = "admin@aquahavuz.com"
const NEW_PASSWORD = "AynaAdmin2026!"

export default async function resetAdminPassword({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const authService = container.resolve(Modules.AUTH)

    logger.info(`🔑 [reset-admin] ${ADMIN_EMAIL} şifresi sıfırlanıyor...`)

    try {
        // updateProvider, emailpass provider'ında şifreyi yeniden hash'ler
        const result = await authService.updateProvider("emailpass", {
            entity_id: ADMIN_EMAIL,
            password: NEW_PASSWORD,
        })
        logger.info(`✅ [reset-admin] Şifre güncellendi: ${ADMIN_EMAIL}`)
        logger.info(`   Yeni şifre: ${NEW_PASSWORD}`)
        logger.info(`   (Sonuç: ${JSON.stringify(result).slice(0, 100)})`)
    } catch (err: any) {
        logger.error(`❌ [reset-admin] HATA: ${err.message}`)
        console.error(err)
    }
}
