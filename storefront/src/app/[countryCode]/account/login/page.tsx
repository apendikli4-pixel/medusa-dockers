import Link from "next/link"
import { redirect } from "next/navigation"
import LoginForm from "@/components/LoginForm"
import { retrieveCustomer } from "@/lib/server/customer"

export default async function LoginPage({
    params,
    searchParams,
}: {
    params: Promise<{ countryCode: string }>
    searchParams: Promise<{ redirectTo?: string }>
}) {
    const { countryCode } = await params
    const { redirectTo } = await searchParams

    // Zaten oturum açıksa hesap sayfasına yönlendir
    const existing = await retrieveCustomer()
    if (existing) redirect(redirectTo || `/${countryCode}/account`)

    return (
        <main className="ag-page">
            <div className="ag-auth-wrap">
                <h1 className="ag-auth-title">Giriş Yap</h1>
                <p className="ag-auth-subtitle">Hesabınıza erişmek için giriş yapın.</p>
                <LoginForm countryCode={countryCode} redirectTo={redirectTo} />
                <div className="ag-auth-alt">
                    Henüz hesabınız yok mu?{" "}
                    <Link
                        href={`/${countryCode}/account/register${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
                        className="ag-link"
                    >
                        Hesap oluşturun
                    </Link>
                </div>
            </div>
        </main>
    )
}
