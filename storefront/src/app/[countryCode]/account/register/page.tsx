import Link from "next/link"
import { redirect } from "next/navigation"
import RegisterForm from "@/components/RegisterForm"
import { retrieveCustomer } from "@/lib/server/customer"

export default async function RegisterPage({
    params,
}: {
    params: Promise<{ countryCode: string }>
}) {
    const { countryCode } = await params
    const existing = await retrieveCustomer()
    if (existing) redirect(`/${countryCode}/account`)

    return (
        <main className="ag-page">
            <div className="ag-auth-wrap">
                <h1 className="ag-auth-title">Hesap Oluştur</h1>
                <p className="ag-auth-subtitle">
                    Sipariş takibi ve hızlı ödeme için bir hesap oluşturun.
                </p>
                <RegisterForm countryCode={countryCode} />
                <div className="ag-auth-alt">
                    Zaten hesabınız var mı?{" "}
                    <Link href={`/${countryCode}/account/login`} className="ag-link">
                        Giriş yapın
                    </Link>
                </div>
            </div>
        </main>
    )
}
