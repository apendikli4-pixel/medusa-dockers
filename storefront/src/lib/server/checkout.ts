/**
 * Checkout helpers — server-side.
 *
 * Medusa V2 checkout akışı (doğrulanmış SDK metodları):
 *   1) sdk.store.cart.update(id, { email, shipping_address, billing_address })
 *   2) sdk.store.fulfillment.listCartOptions({ cart_id })
 *   3) sdk.store.cart.addShippingMethod(id, { option_id })
 *   4) sdk.store.payment.initiatePaymentSession(cart, { provider_id })
 *   5) sdk.store.cart.complete(id) → { type: "order", order } | { type: "cart", error }
 *
 * Cart, cookie `_medusa_cart_id` üzerinden persist edilir (cart.ts ile aynı).
 */
import "server-only"
import { cookies } from "next/headers"
import { sdk } from "../medusa-client"
// Çoklu mağaza: checkout çağrıları da aktif tenant'ın publishable key'i ile yapılır.
import { tenantHeaders } from "./data"

const CART_COOKIE = "_medusa_cart_id"

const CHECKOUT_FIELDS =
    "id,email,currency_code,region_id,subtotal,shipping_total,tax_total,total," +
    "items.id,items.title,items.quantity,items.unit_price,items.total,items.thumbnail,items.product_handle," +
    "shipping_address.*,billing_address.*," +
    "shipping_methods.id,shipping_methods.name,shipping_methods.amount," +
    "payment_collection.id,payment_collection.payment_sessions.id,payment_collection.payment_sessions.provider_id,payment_collection.payment_sessions.status"

export type CheckoutAddress = {
    first_name: string
    last_name: string
    address_1: string
    city: string
    postal_code: string
    phone?: string
    country_code?: string
    province?: string
    company?: string
}

export type CheckoutCart = {
    id: string
    email: string | null
    currency_code: string
    region_id: string
    subtotal: number
    shipping_total: number
    tax_total: number
    total: number
    items: Array<{
        id: string
        title: string
        quantity: number
        unit_price: number
        total?: number
        thumbnail?: string | null
        product_handle?: string
    }>
    shipping_address?: Record<string, unknown> | null
    billing_address?: Record<string, unknown> | null
    shipping_methods?: Array<{ id: string; name: string; amount: number }>
    payment_collection?: {
        id: string
        payment_sessions?: Array<{
            id: string
            provider_id: string
            status: string
        }>
    } | null
}

export type ShippingOption = {
    id: string
    name: string
    amount: number
    price_type: string
}

async function getCartId(): Promise<string | null> {
    const c = await cookies()
    return c.get(CART_COOKIE)?.value || null
}

/**
 * Checkout için gerekli tüm alanlarla cart'ı getir.
 */
export async function retrieveCheckoutCart(): Promise<CheckoutCart | null> {
    const cartId = await getCartId()
    if (!cartId) return null
    try {
        const { cart } = await sdk.store.cart.retrieve(cartId, {
            fields: CHECKOUT_FIELDS,
        }, await tenantHeaders())
        return cart as unknown as CheckoutCart
    } catch {
        return null
    }
}

/**
 * Adres + e-posta kaydet. shipping = billing (tek adres akışı).
 */
export async function setCheckoutAddress(input: {
    email: string
    address: CheckoutAddress
}): Promise<{ ok: true } | { ok: false; message: string }> {
    const cartId = await getCartId()
    if (!cartId) return { ok: false, message: "Sepet bulunamadı." }

    const addr = {
        first_name: input.address.first_name,
        last_name: input.address.last_name,
        address_1: input.address.address_1,
        city: input.address.city,
        postal_code: input.address.postal_code,
        phone: input.address.phone || "",
        country_code: (input.address.country_code || "tr").toLowerCase(),
        province: input.address.province || "",
        company: input.address.company || "",
    }

    try {
        await sdk.store.cart.update(cartId, {
            email: input.email,
            shipping_address: addr,
            billing_address: addr,
        }, {}, await tenantHeaders())
        return { ok: true }
    } catch (err: any) {
        return { ok: false, message: err?.message || "Adres kaydedilemedi." }
    }
}

/**
 * Sepete uygun kargo seçeneklerini listele.
 */
export async function listShippingOptions(): Promise<ShippingOption[]> {
    const cartId = await getCartId()
    if (!cartId) return []
    try {
        // listCartOptions SDK tip tanımında bulunmayabilir; metod runtime'da mevcut.
        const { shipping_options } = await (
            sdk.store.fulfillment as unknown as {
                listCartOptions: (q: { cart_id: string }, headers?: Record<string, string>) => Promise<{
                    shipping_options: any[]
                }>
            }
        ).listCartOptions({ cart_id: cartId }, await tenantHeaders())

        return (shipping_options || []).map((o: any) => ({
            id: o.id,
            name: o.name,
            amount: typeof o.amount === "number" ? o.amount : 0,
            price_type: o.price_type || "flat",
        }))
    } catch (err) {
        console.error("[listShippingOptions]", err)
        return []
    }
}

/**
 * Kargo yöntemini sepete ekle.
 */
export async function setShippingMethod(
    optionId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
    const cartId = await getCartId()
    if (!cartId) return { ok: false, message: "Sepet bulunamadı." }
    try {
        await sdk.store.cart.addShippingMethod(cartId, { option_id: optionId }, {}, await tenantHeaders())
        return { ok: true }
    } catch (err: any) {
        return { ok: false, message: err?.message || "Kargo seçilemedi." }
    }
}

/**
 * Ödeme oturumu başlat (manual provider = kapıda ödeme/havale).
 */
export async function initPaymentSession(
    providerId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
    const cart = await retrieveCheckoutCart()
    if (!cart) return { ok: false, message: "Sepet bulunamadı." }
    try {
        await sdk.store.payment.initiatePaymentSession(cart as any, {
            provider_id: providerId,
        }, {}, await tenantHeaders())
        return { ok: true }
    } catch (err: any) {
        return { ok: false, message: err?.message || "Ödeme başlatılamadı." }
    }
}

/**
 * Sepeti tamamla → sipariş oluştur. Başarılıysa cart cookie temizlenir.
 */
export async function completeCheckout(): Promise<
    { ok: true; orderId: string } | { ok: false; message: string }
> {
    const cartId = await getCartId()
    if (!cartId) return { ok: false, message: "Sepet bulunamadı." }
    try {
        const res = await sdk.store.cart.complete(cartId, {}, await tenantHeaders())
        if (res.type === "order") {
            const c = await cookies()
            c.delete(CART_COOKIE)
            return { ok: true, orderId: (res.order as any).id }
        }
        // type === "cart" → ödeme/stok hatası
        return {
            ok: false,
            message:
                (res as any)?.error?.message ||
                "Sipariş tamamlanamadı. Lütfen bilgileri kontrol edin.",
        }
    } catch (err: any) {
        return { ok: false, message: err?.message || "Sipariş tamamlanamadı." }
    }
}
