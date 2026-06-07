import { ReactNode } from "react"
import Link from "next/link"
import Header from "@/components/Header"

// Tüm storefront sayfaları çalışma anında (SSR) render edilir; build sırasında
// backend'e gidilmez. Bu sayede `next build` backend ayakta olmadan da geçer
// ve production modunda (`next start`) hızlı/stabil çalışır (next dev kaldırıldı).
export const dynamic = "force-dynamic"

export default async function CountryLayout({
    children,
    params,
}: {
    children: ReactNode
    params: Promise<{ countryCode: string }>
}) {
    const { countryCode } = await params
    return (
        <div className="flex flex-col min-h-screen">
            <Header countryCode={countryCode} />
            <div className="flex-grow">{children}</div>
            <footer className="bg-slate-900 text-slate-300 py-12 mt-20 border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <h3 className="text-white font-heading font-semibold text-lg mb-4">Ayna Genesis</h3>
                            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
                                Dürüstlük odaklı, yapay zeka destekli otonom e-ticaret altyapısı. Premium alışveriş deneyimi.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-4">Kurumsal</h4>
                            <ul className="space-y-2 text-sm">
                                <li><Link href={`/${countryCode}/pages/hakkimizda`} className="hover:text-white transition-colors">Hakkımızda</Link></li>
                                <li><Link href={`/${countryCode}/pages/iletisim`} className="hover:text-white transition-colors">İletişim</Link></li>
                                <li><Link href={`/${countryCode}/pages/sss`} className="hover:text-white transition-colors">Sıkça Sorulan Sorular</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-4">Yasal</h4>
                            <ul className="space-y-2 text-sm">
                                <li><Link href={`/${countryCode}/pages/gizlilik-politikasi`} className="hover:text-white transition-colors">Gizlilik Politikası</Link></li>
                                <li><Link href={`/${countryCode}/pages/kullanim-kosullari`} className="hover:text-white transition-colors">Kullanım Koşulları</Link></li>
                                <li><Link href={`/${countryCode}/pages/iade-sartlari`} className="hover:text-white transition-colors">İade ve İptal Şartları</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-12 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
                        <p>© {new Date().getFullYear()} Ayna Genesis. Tüm hakları saklıdır.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
