/**
 * Cart helpers — server-side. cookie üzerinden cart_id persist edilir.
 */
import "server-only"
import { cookies } from "next/headers"
import { sdk } from "../medusa-client"
import { getDefaultRegion } from "./data"

const CART_COOKIE = "_medusa_cart_id"

export type StoreCart = {
    id: string
    region_id: string
    currency_code: string
    items: Array<{
        id: string
        title: string
        product_handle?: string
        thumbnail?: string | null
        quantity: number
        unit_price: number
        subtotal: number
        variant_id: string
    }>
    subtotal: number
    total: number
    item_total: number
    item_count?: number
}

/**
 * Mevcut cart'ı getir veya yeni oluştur (cookie üzerinden persist).
 */
export async function getOrCreateCart(): Promise<StoreCart | null> {
    const c = await cookies()
    const cartId = c.get(CART_COOKIE)?.value

    if (cartId) {
        try {
            const { cart } = await sdk.store.cart.retrieve(cartId, {
                fields: "id,region_id,currency_code,subtotal,total,item_total,items.*,items.product.handle,items.thumbnail",
            })
            if (cart && !cart.completed_at) {
                return cart as unknown as StoreCart
            }
        } catch {
            // cart silinmiş veya completed — yeni oluştur
        }
    }

    const region = await getDefaultRegion()
    if (!region) return null

    try {
        const { cart } = await sdk.store.cart.create({ region_id: region.id })
        c.set(CART_COOKIE, cart.id, {
            maxAge: 60 * 60 * 24 * 30,
            path: "/",
            httpOnly: false,
            sameSite: "lax",
        })
        return cart as unknown as StoreCart
    } catch (err) {
        console.error("[getOrCreateCart]", err)
        return null
    }
}

/**
 * Sadece okuma — cookie'de varsa retrieve, yoksa null.
 */
export async function retrieveCart(): Promise<StoreCart | null> {
    const c = await cookies()
    const cartId = c.get(CART_COOKIE)?.value
    if (!cartId) return null
    try {
        const { cart } = await sdk.store.cart.retrieve(cartId, {
            fields: "id,region_id,currency_code,subtotal,total,item_total,items.*,items.product.handle,items.thumbnail",
        })
        return cart as unknown as StoreCart
    } catch {
        return null
    }
}
