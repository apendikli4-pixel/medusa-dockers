"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import {
    setCheckoutAddress,
    setShippingMethod,
    initPaymentSession,
    completeCheckout,
} from "@/lib/server/checkout"

export type CheckoutFormState = { error?: string }

/**
 * Adres adımı → kaydet, delivery adımına geç.
 */
export async function saveAddressAction(
    _prev: CheckoutFormState,
    formData: FormData
): Promise<CheckoutFormState> {
    const countryCode = String(formData.get("countryCode") || "tr")
    const email = String(formData.get("email") || "").trim().toLowerCase()
    const first_name = String(formData.get("first_name") || "").trim()
    const last_name = String(formData.get("last_name") || "").trim()
    const address_1 = String(formData.get("address_1") || "").trim()
    const city = String(formData.get("city") || "").trim()
    const postal_code = String(formData.get("postal_code") || "").trim()
    const phone = String(formData.get("phone") || "").trim()

    if (!email || !first_name || !last_name || !address_1 || !city || !postal_code) {
        return { error: "Lütfen tüm zorunlu alanları doldurun." }
    }

    const res = await setCheckoutAddress({
        email,
        address: {
            first_name,
            last_name,
            address_1,
            city,
            postal_code,
            phone,
            country_code: countryCode,
        },
    })
    if (!res.ok) return { error: res.message }

    revalidatePath(`/${countryCode}/checkout`)
    redirect(`/${countryCode}/checkout?step=delivery`)
}

/**
 * Kargo adımı → yöntem seç, payment adımına geç.
 */
export async function selectShippingAction(
    _prev: CheckoutFormState,
    formData: FormData
): Promise<CheckoutFormState> {
    const countryCode = String(formData.get("countryCode") || "tr")
    const optionId = String(formData.get("option_id") || "")
    if (!optionId) return { error: "Lütfen bir kargo yöntemi seçin." }

    const res = await setShippingMethod(optionId)
    if (!res.ok) return { error: res.message }

    revalidatePath(`/${countryCode}/checkout`)
    redirect(`/${countryCode}/checkout?step=payment`)
}

/**
 * Ödeme adımı → provider seç, oturum başlat, review adımına geç.
 */
export async function selectPaymentAction(
    _prev: CheckoutFormState,
    formData: FormData
): Promise<CheckoutFormState> {
    const countryCode = String(formData.get("countryCode") || "tr")
    const providerId = String(formData.get("provider_id") || "pp_manual_manual")

    const res = await initPaymentSession(providerId)
    if (!res.ok) return { error: res.message }

    revalidatePath(`/${countryCode}/checkout`)
    redirect(`/${countryCode}/checkout?step=review`)
}

/**
 * Review adımı → siparişi tamamla, onay sayfasına git.
 */
export async function placeOrderAction(
    _prev: CheckoutFormState,
    formData: FormData
): Promise<CheckoutFormState> {
    const countryCode = String(formData.get("countryCode") || "tr")

    const res = await completeCheckout()
    if (!res.ok) return { error: res.message }

    revalidatePath(`/${countryCode}`)
    redirect(`/${countryCode}/order/confirmed/${res.orderId}`)
}
