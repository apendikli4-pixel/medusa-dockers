"use client"

import { useEffect } from "react"

/**
 * Next.js 15 Global Error Boundary
 *
 * Tüm yakalanmamış hatalar bu bileşene düşer.
 * Production'da kullanıcıya temiz bir hata sayfası gösterir,
 * stack trace veya internal detay asla göstermez.
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Production'da error reporting servise gönder (Sentry, GlitchTip vb.)
        console.error("[GlobalError]", error)
    }, [error])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
            <div className="max-w-md w-full text-center">
                {/* Animated error icon */}
                <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                    <svg
                        className="w-10 h-10 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                        />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Bir şeyler ters gitti
                </h1>
                <p className="text-gray-600 mb-8">
                    Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin veya
                    daha sonra tekrar deneyin.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="px-6 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                    >
                        Tekrar Dene
                    </button>
                    <a
                        href="/"
                        className="px-6 py-3 bg-white text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-colors border border-gray-200"
                    >
                        Ana Sayfaya Dön
                    </a>
                </div>

                {/* Error digest (support reference) */}
                {error.digest && (
                    <p className="mt-6 text-xs text-gray-400">
                        Hata Referans: {error.digest}
                    </p>
                )}
            </div>
        </div>
    )
}
