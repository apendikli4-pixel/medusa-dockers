import Link from "next/link"

/**
 * Next.js 15 Custom 404 Page
 *
 * Kullanıcılar var olmayan bir URL'ye gittiğinde bu sayfa gösterilir.
 * SEO dostu, markaya uyumlu ve navigasyon seçenekleri sunar.
 */
export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
            <div className="max-w-md w-full text-center">
                {/* 404 büyük rakam */}
                <div className="mb-6">
                    <span className="text-8xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        404
                    </span>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Sayfa Bulunamadı
                </h1>
                <p className="text-gray-600 mb-8">
                    Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/"
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-lg shadow-blue-600/20"
                    >
                        Ana Sayfaya Dön
                    </Link>
                    <Link
                        href="/tr/store"
                        className="px-6 py-3 bg-white text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-colors border border-gray-200"
                    >
                        Ürünleri Keşfet
                    </Link>
                </div>
            </div>
        </div>
    )
}
