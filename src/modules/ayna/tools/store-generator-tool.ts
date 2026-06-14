import { SchemaType } from "./schema-types"

export const storeGeneratorTool = {
    name: "generate_storefront_data",
    description: "Sıfırdan bir mağaza altyapısı kurar. Verilen konseptte kategoriler, ürünler ve ilk blog yazısını toplu olarak veritabanına ekler. Sadece Admin kullanabilir.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            concept_name: {
                type: SchemaType.STRING,
                description: "Oluşturulan mağazanın veya konseptin genel adı (örn: Kışlık Havuz Ürünleri)"
            },
            sector: {
                type: SchemaType.STRING,
                description: "Mağazanın ait olduğu sektör (örn: retail, pool, vape, fashion, horeca, b2b)"
            },
            categories: {
                type: SchemaType.ARRAY,
                description: "Oluşturulacak kategorilerin listesi",
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        name: { type: SchemaType.STRING },
                        description: { type: SchemaType.STRING }
                    },
                    required: ["name", "description"]
                }
            },
            products: {
                type: SchemaType.ARRAY,
                description: "Oluşturulacak özellikli ürünlerin listesi (her kategori için en az 1-2 adet yaratılmalıdır)",
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        title: { type: SchemaType.STRING },
                        description: { type: SchemaType.STRING, description: "SEO ve satış odaklı açıklama" },
                        category_name: { type: SchemaType.STRING, description: "Hangi kategoriye ait olduğu (Yukarıdaki kategorilerden biriyle eşleşmeli)" },
                        price: { type: SchemaType.NUMBER, description: "Ürünün TRY cinsinden ortalama piyasa fiyatı" }
                    },
                    required: ["title", "description", "category_name", "price"]
                }
            },
            blog_post: {
                type: SchemaType.OBJECT,
                description: "İSTEĞE BAĞLI. Açılış/konsept tanıtımı için ilk SEO dostu makale. Verilmezse otomatik bir tanıtım yazısı oluşturulur — sırf bunun için işlemi bekletme.",
                properties: {
                    title: { type: SchemaType.STRING },
                    content: { type: SchemaType.STRING, description: "Makalenin geniş içeriği (Markdown veya HTML değil, düz metin formatında uzun makale)" }
                },
                required: ["title", "content"]
            }
        },
        required: ["concept_name", "categories", "products"]
    }
}
