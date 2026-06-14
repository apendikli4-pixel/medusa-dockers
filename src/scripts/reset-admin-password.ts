/**
 * reset-admin-password.ts — Admin şifresini güvenli şekilde sıfırlar.
 *
 * Medusa V2 auth modülünün updateProvider metodunu kullanır (scrypt hash
 * otomatik üretilir — manuel hash YAZMAYIZ, kırılgan ve hataya açık).
 *
 * GÜVENLİK: Parola ASLA kaynak kodda sabit olmaz ve log'lanmaz. Env'den okunur
 * ve zorunludur; verilmezse işlem güvenli şekilde reddedilir (sahte/varsayılan parola yok).
 *
 * Çalıştırma:
 *   ADMIN_EMAIL=admin@aquahavuz.com ADMIN_RESET_PASSWORD='<güçlü-parola>' \
 *     docker exec medusa_server_core_v2 npx medusa exec ./src/scripts/reset-admin-password.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

// E-posta gizli değildir; env ile override edilebilir, makul varsayılanı vardır.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@aquahavuz.com"

export default async function resetAdminPassword({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const authService = container.resolve(Modules.AUTH)

    // Parola yalnızca env'den; sabit/varsayılan YOK. Yoksa fail-closed.
    const newPassword = process.env.ADMIN_RESET_PASSWORD
    if (!newPassword || newPassword.length < 10) {
        logger.error(
            "❌ [reset-admin] ADMIN_RESET_PASSWORD env değişkeni gerekli (en az 10 karakter). " +
            "Örnek: ADMIN_RESET_PASSWORD='...' ... npx medusa exec ./src/scripts/reset-admin-password.ts"
        )
        return
    }

    logger.info(`🔑 [reset-admin] ${ADMIN_EMAIL} şifresi sıfırlanıyor...`)

    try {
        // updateProvider, emailpass provider'ında şifreyi yeniden hash'ler
        await authService.updateProvider("emailpass", {
            entity_id: ADMIN_EMAIL,
            password: newPassword,
        })
        // Parolayı ASLA log'lama — yalnızca başarı bildir.
        logger.info(`✅ [reset-admin] Şifre güncellendi: ${ADMIN_EMAIL} (parola env'den, gösterilmedi).`)
    } catch (err: any) {
        logger.error(`❌ [reset-admin] HATA: ${err.message}`)
    }
}
