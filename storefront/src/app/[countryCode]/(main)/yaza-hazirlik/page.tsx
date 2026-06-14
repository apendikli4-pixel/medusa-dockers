import React from "react"
import { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import PoolCalculator from "@/modules/campaigns/components/pool-calculator"
import { retrieveCurrentTenant } from "@/lib/server/tenant"

export const metadata: Metadata = {
  title: "Yaza Hazırlık: Havuz Suyu Bakım Rehberi",
  description: "Havuzunuzu yaza hazırlamak için ihtiyacınız olan tüm kimyasallar ve bakım adımları. Havuz hacminizi hesaplayın ve indirimli ürünleri keşfedin.",
}

export default async function SummerCampaignPage({ params }: { params: Promise<{ countryCode: string }> }) {
  const { countryCode } = await params;

  // Çoklu mağaza: bu havuz kampanyası yalnızca havuz işi yapan mağazalarda görünür.
  // Aqua Havuz'un sektörü "retail" (havuz ürünü satar), gelecekteki havuz mağazaları
  // "pool" olabilir → ikisine de izin. Vozol (vape) gibi alakasız sektörlerde 404.
  const tenant = await retrieveCurrentTenant();
  const sector = (tenant?.sector || "").toLowerCase();
  if (!["pool", "retail"].includes(sector)) {
    notFound();
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0d9488] relative overflow-hidden">
      {/* Dekoratif Arka Plan Işıkları */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-400/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full mix-blend-screen filter blur-[120px]"></div>

      <div className="content-container mx-auto px-6 py-20 relative z-10 max-w-6xl">
        <div className="text-center mb-16">
          <span className="inline-block py-1 px-3 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/30 text-sm font-semibold tracking-wider uppercase mb-6 shadow-[0_0_15px_rgba(45,212,191,0.2)]">
            YAZ2026 Kampanyası Başladı
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-teal-200 mb-6 drop-shadow-sm tracking-tight">
            Havuzunuz Yaza Hazır Mı?
          </h1>
          <p className="text-xl md:text-2xl text-blue-100/90 max-w-3xl mx-auto font-light leading-relaxed">
            Berrak ve sağlıklı bir havuz suyu için yapmanız gerekenler çok basit. 
            Hacminizi hesaplayın, AI asistanımız Ayna size doğru kimyasalı önersin.
          </p>
        </div>

        {/* Havuz Hesaplayıcı Widget */}
        <div className="mb-24 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-blue-500 rounded-3xl blur opacity-20"></div>
            <PoolCalculator />
        </div>

        {/* SEO ve Bilgi Bölümü */}
        <div className="grid md:grid-cols-2 gap-12 items-center bg-white/5 border border-white/10 rounded-3xl p-10 backdrop-blur-sm">
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">Neden Şoklama Yapmalıyız?</h2>
            <div className="space-y-4 text-blue-100/80 text-lg leading-relaxed font-light">
              <p>
                Kış aylarında havuz suyunda biriken bakteriler, yosun sporları ve organik atıklar, yaz mevsimine girerken suyun bulanıklaşmasına ve sağlığı tehdit etmesine yol açar.
              </p>
              <p>
                Yüksek dozda klor kullanılarak yapılan <strong className="text-teal-300 font-semibold">şoklama işlemi</strong>, sudaki tüm zararlı organizmaları okside ederek havuzu pırıl pırıl ve güvenli hale getirir. Şoklama yaparken suyun pH değerinin 7.0 - 7.4 aralığında olması klorun etkisini maksimize eder.
              </p>
            </div>
            <div className="mt-8">
              <Link href={`/${countryCode}/store?q=şok`} className="text-teal-400 hover:text-teal-300 font-bold border-b-2 border-teal-400/30 hover:border-teal-300 transition-colors pb-1">
                Şok Klor Çeşitlerini İncele →
              </Link>
            </div>
          </div>
          <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            {/* Dekoratif Havuz İmajı Simülasyonu (Veya Cloudinary Linki eklenebilir) */}
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900 via-transparent to-transparent z-10"></div>
            <Image 
              src="https://images.unsplash.com/photo-1576013551627-11971f3f8f36?auto=format&fit=crop&q=80&w=1000" 
              alt="Berrak Havuz Suyu" 
              fill
              className="object-cover w-full h-full transform hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute bottom-6 left-6 right-6 z-20">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl">
                <p className="text-white font-medium">✨ YAZ2026 koduyla tüm havuz kimyasallarında net %15 indirim.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
