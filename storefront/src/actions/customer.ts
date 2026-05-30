"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import {
    registerCustomer,
    loginCustomer,
    logoutCustomer,
} from "@/lib/server/customer"

export type AuthFormState = {
    error?: string
    success?: boolean
}

/**
 * Register form action.
 * Form alanları: email, password, first_name, last_name, phone, countryCode
 */
export async function registerAction(
    _prev: AuthFormState,
    formData: FormData
): Promise<AuthFormState> {
    const email = String(formData.get("email") || "").trim().toLowerCase()
    const password = String(formData.get("password") || "")
    const first_name = String(formData.get("first_name") || "").trim()
    const last_name = String(formData.get("last_name") || "").trim()
    const phone = String(formData.get("phone") || "").trim()
    const countryCode = String(formData.get("countryCode") || "tr")

    if (!email || !password) {
        return { error: "E-posta ve şifre zorunlu." }
    }
    if (password.length < 6) {
        return { error: "Şifre en az 6 karakter olmalı." }
    }

    const res = await registerCustomer({
        email,
        password,
        first_name,
        last_name,
        phone: phone || undefined,
    })
    if (!("ok" in res) || res.ok !== true) {
        return { error: (res as any).message || "Kayıt başarısız." }
    }

    revalidatePath(`/${countryCode}`)
    redirect(`/${countryCode}/account`)
}

/**
 * Login form action.
 * Form alanları: email, password, countryCode, redirectTo (opsiyonel)
 */
export async function loginAction(
    _prev: AuthFormState,
    formData: FormData
): Promise<AuthFormState> {
    const email = String(formData.get("email") || "").trim().toLowerCase()
    const password = String(formData.get("password") || "")
    const countryCode = String(formData.get("countryCode") || "tr")
    const redirectTo = String(formData.get("redirectTo") || "")

    if (!email || !password) {
        return { error: "E-posta ve şifre zorunlu." }
    }

    const res = await loginCustomer({ email, password })
    if (!("ok" in res) || res.ok !== true) {
        return { error: (res as any).message || "Giriş başarısız." }
    }

    revalidatePath(`/${countryCode}`)
    redirect(redirectTo || `/${countryCode}/account`)
}

/**
 * Logout form action (form post → button).
 */
export async function logoutAction(formData: FormData): Promise<void> {
    const countryCode = String(formData.get("countryCode") || "tr")
    await logoutCustomer()
    revalidatePath(`/${countryCode}`)
    redirect(`/${countryCode}`)
}
