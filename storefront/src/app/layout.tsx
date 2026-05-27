import "./globals.css"
import type { Metadata } from "next"
import { ReactNode } from "react"
// TODO: ChatWidget bileşeni eklenecek
// NOT: next/font/google üretim build'inde dış HTTPS gerektirir; system fontlara
// geçildi (deterministik build + offline derleme için). UI revize edilirken
// yerel font dosyaları (woff2) ile next/font/local kullanılabilir.

export const metadata: Metadata = {
  title: "Ayna Genesis — Yeni Nesil AI Ticaret",
  description: "Yapay zeka destekli, otonom e-ticaret altyapısı.",
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50">
        <main className="flex-grow">
          {children}
        </main>
        {/* ChatWidget will be placed here */}
      </body>
    </html>
  )
}
