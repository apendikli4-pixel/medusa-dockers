import Link from "next/link"
import { redirect } from "next/navigation"
import RegisterForm from "@/components/RegisterForm"
import { retrieveCustomer } from "@/lib/server/customer"

export default async function RegisterPage({
    params,
    searchParams,
}: {
    params: Promise<{ countryCode: string }>
    searchParams: Promise<{ redirectTo?: string }>
}) {
    const { countryCode } = await params
    const { redirectTo } = await searchParams
    const existing = await retrieveCustomer()
    if (existing) redirect(`/${countryCode}/account`)

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 py-20 px-4 relative overflow-hidden">
            
            {/* Arkaplan Şekilleri */}
            <div className="absolute top-[10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px] opacity-20 animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500 rounded-full blur-[120px] opacity-20"></div>

            <div className="w-full max-w-lg relative z-10">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-8 sm:p-10 text-white animate-fade-in-up">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-heading font-bold mb-2">Hesap Oluştur</h1>
                        <p className="text-indigo-200">Ayna Genesis dünyasına katılın ve ayrıcalıklardan yararlanın.</p>
                    </div>
                    
                    <RegisterForm countryCode={countryCode} />
                    
                    <div className="mt-8 text-center text-indigo-200 text-sm">
                        Zaten hesabınız var mı?{" "}
                        <Link 
                            href={`/${countryCode}/account/login${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`} 
                            className="font-bold text-white hover:text-indigo-300 transition-colors underline decoration-indigo-400/50 underline-offset-4"
                        >
                            Giriş yapın
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    )
}
