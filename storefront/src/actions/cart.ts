"use server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { sdk } from "@/lib/medusa-client"
import { getOrCreateCart } from "@/lib/server/cart"
// Çoklu mağaza: line-item çağrıları da aktif tenant'ın key'i ile yapılmalı
// (sepetin bağlı olduğu sales-channel ile ürünün kanalı eşleşsin).
import { tenantHeaders } from "@/lib/server/data"

const CART_COOKIE = "_medusa_cart_id"

export async function addLineAction(variantId: string, quantity = 1) {
    const cart = await getOrCreateCart()
    if (!cart) return { ok: false, error: "Cart oluşturulamadı (region yok mu?)" }
    try {
        await sdk.store.cart.createLineItem(cart.id, { variant_id: variantId, quantity }, {}, await tenantHeaders())
        revalidatePath("/", "layout")
        return { ok: true }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Bilinmeyen hata"
        return { ok: false, error: msg }
    }
}

export async function updateLineAction(lineId: string, quantity: number) {
    const c = await cookies()
    const cartId = c.get(CART_COOKIE)?.value
    if (!cartId) return { ok: false, error: "Sepet yok" }
    try {
        const headers = await tenantHeaders()
        if (quantity < 1) {
            await sdk.store.cart.deleteLineItem(cartId, lineId, {}, headers)
        } else {
            await sdk.store.cart.updateLineItem(cartId, lineId, { quantity }, {}, headers)
        }
        revalidatePath("/", "layout")
        return { ok: true }
    } catch (err: unknown) {
        return { ok: false, error: err instanceof Error ? err.message : "Bilinmeyen hata" }
    }
}

export async function removeLineAction(lineId: string) {
    const c = await cookies()
    const cartId = c.get(CART_COOKIE)?.value
    if (!cartId) return { ok: false, error: "Sepet yok" }
    try {
        await sdk.store.cart.deleteLineItem(cartId, lineId, {}, await tenantHeaders())
        revalidatePath("/", "layout")
        return { ok: true }
    } catch (err: unknown) {
        return { ok: false, error: err instanceof Error ? err.message : "Bilinmeyen hata" }
    }
}
