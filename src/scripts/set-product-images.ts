/**
 * set-product-images.ts — Demo ürünlere thumbnail + görsel atar.
 *
 * Görseller storefront public/products/*.svg altında servis edilir.
 * Thumbnail URL'i tarayıcıdan erişilebilir storefront kökü olur.
 *
 * Çalıştırma:
 *   docker exec medusa_server_core_v2 npx medusa exec ./src/scripts/set-product-images.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

const STOREFRONT_BASE =
    process.env.STOREFRONT_PUBLIC_URL || "http://localhost:8000"

const IMAGE_MAP: Record<string, string> = {
    "aqua-havuz-filtresi": "/products/aqua-havuz-filtresi.svg",
    "klor-tablet": "/products/klor-tablet.svg",
    "havuz-temizlik-robotu": "/products/havuz-temizlik-robotu.svg",
}

export default async function setProductImages({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const productService = container.resolve(Modules.PRODUCT)

    const products = await productService.listProducts(
        {},
        { select: ["id", "title", "handle", "thumbnail"], take: 100 }
    )

    let updated = 0
    for (const p of products) {
        const path = IMAGE_MAP[p.handle as string]
        if (!path) {
            logger.info(`SKIP (eslesme yok): ${p.handle}`)
            continue
        }
        const url = `${STOREFRONT_BASE}${path}`
        await productService.updateProducts(p.id as string, {
            thumbnail: url,
            images: [{ url }],
        })
        logger.info(`OK ${p.title} -> ${url}`)
        updated++
    }

    logger.info(`[set-product-images] ${updated} urun guncellendi.`)
}
