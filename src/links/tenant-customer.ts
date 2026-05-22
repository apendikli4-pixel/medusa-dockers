/**
 * Tenant ↔ Customer Link Tanımı
 *
 * Müşterileri mağazalara bağlar.
 * Bir müşteri birden fazla mağazada hesap açabilir (many-to-many).
 *
 * Kullanım senaryoları:
 * - Müşteri hangi mağazalara kayıtlı? (çoklu mağaza üyeliği)
 * - Mağazanın müşteri listesi
 * - Dinamik Müşteri Destek Ajanı: müşterinin hangi mağazadan yazdığını
 *   API anahtarı + tenant bağlamı ile algılayarak doğru stok ve
 *   politika bilgilerine erişir
 * - Sektörel İçerik Ajanı: tenant_id üzerinden sektör bilgisini alır
 *
 * GENESIS_PROTOCOL: Her iki taraf da explicit object config ile tanımlanır.
 * Modül import'u (CustomerModule.linkable) KULLANILMAZ — cyclic dependency riski.
 *
 * İlişki: N Tenant ↔ N Customer (many-to-many)
 */
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
    {
        linkable: {
            serviceName: "tenant",
            field: "tenant",
            entity: "Tenant",
            linkable: "tenant_id",
            primaryKey: "id",
        },
        isList: true,
    },
    {
        linkable: {
            serviceName: "customer",
            field: "customer",
            entity: "Customer",
            linkable: "customer_id",
            primaryKey: "id",
        },
        isList: true,
    }
)
