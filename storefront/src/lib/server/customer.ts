/**
 * Customer auth helpers — server-side.
 *
 * Akış (Medusa V2):
 *   1) POST /auth/customer/emailpass/register → registration token (geçici)
 *   2) POST /store/customers (Authorization: Bearer <reg-token>) → customer kaydı
 *   3) POST /auth/customer/emailpass → JWT (oturum token)
 *   4) /store/customers/me, /store/orders → Authorization: Bearer <jwt> ile
 *
 * Token cookie içinde httpOnly olarak saklanır (CUSTOMER_JWT_COOKIE).
 */
import "server-only"
import { cookies } from "next/headers"
import {
    getAuthedMedusaClient,
    CUSTOMER_JWT_COOKIE,
} from "../medusa-client"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
    process.env.MEDUSA_PUBLISHABLE_KEY ||
    ""

export type StoreCustomer = {
    id: string
    email: string
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
    company_name?: string | null
    has_account?: boolean
    created_at?: string
}

export type StoreOrder = {
    id: string
    display_id: number
    status: string
    payment_status?: string
    fulfillment_status?: string
    currency_code: string
    total: number
    subtotal: number
    created_at: string
    items?: Array<{
        id: string
        title: string
        quantity: number
        unit_price: number
        total: number
        thumbnail?: string | null
    }>
}

type AuthOk = { token: string }
type AuthErr = { ok: false; message: string }

/**
 * Token cookie helper — httpOnly, sameSite=lax, 30 gün.
 */
async function setJwtCookie(token: string) {
    const c = await cookies()
    c.set(CUSTOMER_JWT_COOKIE, token, {
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
    })
}

async function clearJwtCookie() {
    const c = await cookies()
    c.delete(CUSTOMER_JWT_COOKIE)
}

/**
 * Düşük seviye fetch — Medusa SDK auth.register/login direkt JWT döner
 * ama Next.js server-side'da fetch ile yapmak daha açık ve cookie kontrolü
 * tamamen bizde olur.
 */
async function postJson<T = any>(
    path: string,
    body: Record<string, any>,
    authToken?: string
): Promise<{ ok: true; data: T } | AuthErr> {
    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "x-publishable-api-key": PUBLISHABLE_KEY,
        }
        if (authToken) headers["Authorization"] = `Bearer ${authToken}`
        const res = await fetch(`${BACKEND_URL}${path}`, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            cache: "no-store",
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
            const message =
                (json as any)?.message ||
                (json as any)?.error ||
                `${res.status} ${res.statusText}`
            return { ok: false, message }
        }
        return { ok: true, data: json as T }
    } catch (err: any) {
        return { ok: false, message: err?.message || "Ağ hatası" }
    }
}

/**
 * Yeni müşteri kaydı — register + customer create + auto-login.
 *
 * Backend zaten register sırasında bir JWT döner; bu JWT registration token'dır
 * ve /store/customers POST için yeterlidir. Customer oluşturulduktan sonra
 * /auth/customer/emailpass ile gerçek login JWT'sini alırız ve cookie'ye yazarız.
 */
export async function registerCustomer(input: {
    email: string
    password: string
    first_name?: string
    last_name?: string
    phone?: string
}): Promise<{ ok: true; customer: StoreCustomer } | AuthErr> {
    // 1) Register → registration token
    const regRes = await postJson<{ token: string }>(
        "/auth/customer/emailpass/register",
        { email: input.email, password: input.password }
    )
    if (!regRes.ok) {
        // "Identity with email already exists" → mevcut hesap, login dene
        if (/already exists/i.test(regRes.message)) {
            return { ok: false, message: "Bu e-posta ile zaten bir hesap var. Giriş yapın." }
        }
        return regRes
    }
    const regToken = regRes.data.token

    // 2) Customer kaydı
    const custRes = await postJson<{ customer: StoreCustomer }>(
        "/store/customers",
        {
            email: input.email,
            first_name: input.first_name || "",
            last_name: input.last_name || "",
            phone: input.phone || undefined,
        },
        regToken
    )
    if (!custRes.ok) return custRes

    // 3) Auto-login → gerçek session JWT
    const loginRes = await postJson<{ token: string }>(
        "/auth/customer/emailpass",
        { email: input.email, password: input.password }
    )
    if (!loginRes.ok) return loginRes

    await setJwtCookie(loginRes.data.token)
    return { ok: true, customer: custRes.data.customer }
}

/**
 * Mevcut hesap için login — JWT alır, cookie'ye yazar.
 */
export async function loginCustomer(input: {
    email: string
    password: string
}): Promise<{ ok: true } | AuthErr> {
    const res = await postJson<{ token: string }>(
        "/auth/customer/emailpass",
        { email: input.email, password: input.password }
    )
    if (!res.ok) {
        if (/unauthorized|invalid/i.test(res.message)) {
            return { ok: false, message: "E-posta veya şifre hatalı." }
        }
        return res
    }
    await setJwtCookie(res.data.token)
    return { ok: true }
}

/**
 * Çıkış yap — cookie'yi temizle.
 */
export async function logoutCustomer(): Promise<void> {
    await clearJwtCookie()
}

/**
 * Oturum açık müşteriyi getir. JWT cookie yoksa veya geçersizse null döner.
 */
export async function retrieveCustomer(): Promise<StoreCustomer | null> {
    const c = await cookies()
    if (!c.get(CUSTOMER_JWT_COOKIE)?.value) return null
    try {
        const sdk = await getAuthedMedusaClient()
        const { customer } = await sdk.store.customer.retrieve({
            fields: "id,email,first_name,last_name,phone,company_name,has_account,created_at",
        })
        return (customer as unknown as StoreCustomer) ?? null
    } catch {
        // Token süresi dolmuş olabilir; sessiz null
        return null
    }
}

/**
 * Müşterinin sipariş geçmişi. Oturum yoksa boş liste.
 */
export async function listCustomerOrders(opts?: {
    limit?: number
    offset?: number
}): Promise<{ orders: StoreOrder[]; count: number }> {
    const c = await cookies()
    if (!c.get(CUSTOMER_JWT_COOKIE)?.value) return { orders: [], count: 0 }
    try {
        const sdk = await getAuthedMedusaClient()
        const res = await sdk.store.order.list({
            limit: opts?.limit ?? 20,
            offset: opts?.offset ?? 0,
            fields:
                "id,display_id,status,payment_status,fulfillment_status,currency_code,total,subtotal,created_at,items.id,items.title,items.quantity,items.unit_price,items.total,items.thumbnail",
        })
        const orders = (res as any)?.orders ?? []
        const count = (res as any)?.count ?? orders.length
        return { orders: orders as StoreOrder[], count }
    } catch (err) {
        console.error("[listCustomerOrders]", err)
        return { orders: [], count: 0 }
    }
}

/**
 * Tek sipariş — display_id veya id ile.
 */
export async function retrieveCustomerOrder(orderId: string): Promise<StoreOrder | null> {
    const c = await cookies()
    if (!c.get(CUSTOMER_JWT_COOKIE)?.value) return null
    try {
        const sdk = await getAuthedMedusaClient()
        const { order } = await sdk.store.order.retrieve(orderId, {
            fields:
                "id,display_id,status,payment_status,fulfillment_status,currency_code,total,subtotal,created_at,items.*,shipping_address.*,billing_address.*",
        })
        return (order as unknown as StoreOrder) ?? null
    } catch {
        return null
    }
}
