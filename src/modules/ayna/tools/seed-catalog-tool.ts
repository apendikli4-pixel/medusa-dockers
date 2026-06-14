import { SchemaType } from "./schema-types"

/**
 * Deterministik sektör kataloğu yükleyici.
 *
 * "Havuzculuğun tüm kategorilerini ve ürünlerini ekle" gibi TOPLU istekleri,
 * modelin katalogu kafasından üretmesine gerek kalmadan, küratörlü hazır
 * katalogdan (src/modules/ayna/data/sector-catalogs.ts) TEK seferde basar.
 * create_category/create_product'ı teker teker çağırmaya KIYASLA çok daha güvenilir.
 * Sadece Admin.
 */
export const seedCatalogTool = {
    name: "seed_sector_catalog",
    description:
        "Bir sektörün TÜM kategorilerini ve örnek ürünlerini hazır küratörlü katalogdan TEK işlemde toplu olarak veritabanına ekler. " +
        "Kullanıcı 'havuzculuğun/sektörün tüm kategorilerini ve ürünlerini ekle', 'kataloğu kur', 'mağazayı ürünlerle doldur' gibi TOPLU bir istekte bulunduğunda bunu kullan. " +
        "Kategorileri/ürünleri teker teker create_category veya create_product ile EKLEME. Sadece Admin kullanabilir.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            sector: {
                type: SchemaType.STRING,
                description:
                    "Katalogu yüklenecek sektör (örn: pool). Belirtilmezse mağazanın kendi sektörü kullanılır.",
            },
        },
        required: [],
    },
}
