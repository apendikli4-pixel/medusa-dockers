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
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-20 px-4 relative overflow-hidden">
            
            {/* Arkaplan Şekilleri */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px] opacity-20 animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px] opacity-20"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-8 sm:p-10 text-white animate-fade-in-up">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-heading font-bold mb-2">Giriş Yap</h1>
                        <p className="text-blue-200">Ayna Genesis hesabınıza erişmek için bilgilerinizi girin.</p>
                    </div>
                    
                    <LoginForm countryCode={countryCode} redirectTo={redirectTo} />
                    
                    <div className="mt-8 text-center text-blue-200 text-sm">
                        Henüz hesabınız yok mu?{" "}
                        <Link
                            href={`/${countryCode}/account/register${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
                            className="font-bold text-white hover:text-blue-300 transition-colors underline decoration-blue-400/50 underline-offset-4"
                        >
                            Hesap oluşturun
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    )
}
