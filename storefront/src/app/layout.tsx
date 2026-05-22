import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ReactNode } from "react"
// TODO: ChatWidget bileşeni eklenecek

const inter = Inter({ subsets: ["latin"] })

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
      <body className={`${inter.className} min-h-full flex flex-col bg-gray-50`}>
        <main className="flex-grow">
          {children}
        </main>
        {/* ChatWidget will be placed here */}
      </body>
    </html>
  )
}
