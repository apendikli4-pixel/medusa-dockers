import {
    createApiKeysWorkflow,
    createRegionsWorkflow,
    createSalesChannelsWorkflow,
    createUsersWorkflow,
    linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"
import { ExecArgs, Logger } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function seedInitial({
    container,
}: ExecArgs) {
    const logger = container.resolve<Logger>("logger")
    const userModuleService = container.resolve(Modules.USER)
    const regionModuleService = container.resolve(Modules.REGION)
    const apiKeyModuleService = container.resolve(Modules.API_KEY)
    const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)

    logger.info("Başlangıç verileri oluşturuluyor...")

    try {
        // 1. Admin Kullanıcısı Oluştur
        const [existingUser] = await userModuleService.listUsers({ email: "admin@ayna.com" })
        if (!existingUser) {
            logger.info("Admin kullanıcısı oluşturuluyor: admin@ayna.com")
            await createUsersWorkflow(container).run({
                input: {
                    users: [
                        {
                            email: "admin@ayna.com",
                            first_name: "Admin",
                            last_name: "Ayna",
                        },
                    ],
                },
            })
            // Not: Şifreleme Medusa v2'de auth provider üzerinden yapılıyor, 
            // CLI/Workflow ile oluşturulan kullanıcılar ilk girişte şifre sıfırlama veya 
            // auth provision gerektirebilir. Ancak bu adım kullanıcı kaydını oluşturur.
        } else {
            logger.info("Admin kullanıcısı zaten mevcut.")
        }

        // 2. Bölge (Region) Oluştur
        const [existingRegion] = await regionModuleService.listRegions({ name: "Turkey" })
        if (!existingRegion) {
            logger.info("Türkiye bölgesi oluşturuluyor...")
            await createRegionsWorkflow(container).run({
                input: {
                    regions: [
                        {
                            name: "Turkey",
                            currency_code: "try",
                            countries: ["tr"],
                            is_tax_inclusive: true,
                        },
                    ],
                },
            })
        } else {
            logger.info("Türkiye bölgesi zaten mevcut.")
        }

        // 3. Sales Channel ve API Key Oluştur
        const [defaultSC] = await salesChannelModuleService.listSalesChannels({ name: "Default Sales Channel" })
        let scId = defaultSC?.id
        if (!scId) {
            logger.info("Varsayılan Satış Kanalı oluşturuluyor...")
            const { result } = await createSalesChannelsWorkflow(container).run({
                input: {
                    salesChannelsData: [
                        {
                            name: "Default Sales Channel",
                            description: "Main storefront channel",
                        },
                    ],
                },
            })
            scId = result[0].id
        }

        const [existingKey] = await apiKeyModuleService.listApiKeys({ title: "Storefront" })
        if (!existingKey) {
            logger.info("Yayınlanabilir Anahtar oluşturuluyor...")
            const { result: keyResult } = await createApiKeysWorkflow(container).run({
                input: {
                    api_keys: [
                        {
                            title: "Storefront",
                            type: "publishable",
                            created_by: "system",
                        },
                    ],
                },
            })
            const keyId = keyResult[0].id
            const token = keyResult[0].token
            logger.info(`Yeni Anahtar Oluşturuldu: ${token}`)

            // Anahtarı Satış Kanalına Bağla
            await linkSalesChannelsToApiKeyWorkflow(container).run({
                input: {
                    id: keyId,
                    add: [scId],
                },
            })
            logger.info("Anahtar Satış Kanalına bağlandı.")
        } else {
            logger.info(`Yayınlanabilir Anahtar mevcut: ${existingKey.token}`)
        }

        logger.info("Başlangıç verileri başarıyla hazırlandı.")

    } catch (error) {
        logger.error("Seed işlemi sırasında hata oluştu:")
        console.error(error)
    }
}
