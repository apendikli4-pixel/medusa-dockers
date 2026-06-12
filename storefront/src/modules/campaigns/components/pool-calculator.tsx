"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

export default function PoolCalculator() {
  const params = useParams()
  const countryCode = (params?.countryCode as string) || "tr"

  const [length, setLength] = useState<number | "">("")
  const [width, setWidth] = useState<number | "">("")
  const [depth, setDepth] = useState<number | "">("")
  const [result, setResult] = useState<{ volume: number; chlorine: number; phMinus: number } | null>(null)

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!length || !width || !depth) return
    const vol = Number(length) * Number(width) * Number(depth)
    setResult({
      volume: vol,
      chlorine: (vol * 1.5) / 1000, // kg
      phMinus: (vol * 10) / 1000 // kg for 0.1 reduction
    })
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl">
      <h3 className="text-2xl font-bold text-white mb-6 text-center tracking-tight">Havuz Hacim & Kimyasal Hesaplayıcı</h3>
      
      <form onSubmit={handleCalculate} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div>
          <label className="block text-blue-100 text-sm mb-2 uppercase tracking-widest font-semibold">Uzunluk (m)</label>
          <input 
            type="number" 
            step="0.1" 
            value={length} 
            onChange={e => setLength(e.target.value ? parseFloat(e.target.value) : "")}
            className="w-full bg-blue-950/50 border border-blue-400/30 text-white rounded-xl p-4 focus:ring-2 focus:ring-teal-400 focus:outline-none transition-all"
            placeholder="Örn: 10"
            required
          />
        </div>
        <div>
          <label className="block text-blue-100 text-sm mb-2 uppercase tracking-widest font-semibold">Genişlik (m)</label>
          <input 
            type="number" 
            step="0.1" 
            value={width} 
            onChange={e => setWidth(e.target.value ? parseFloat(e.target.value) : "")}
            className="w-full bg-blue-950/50 border border-blue-400/30 text-white rounded-xl p-4 focus:ring-2 focus:ring-teal-400 focus:outline-none transition-all"
            placeholder="Örn: 5"
            required
          />
        </div>
        <div>
          <label className="block text-blue-100 text-sm mb-2 uppercase tracking-widest font-semibold">Derinlik (m)</label>
          <input 
            type="number" 
            step="0.1" 
            value={depth} 
            onChange={e => setDepth(e.target.value ? parseFloat(e.target.value) : "")}
            className="w-full bg-blue-950/50 border border-blue-400/30 text-white rounded-xl p-4 focus:ring-2 focus:ring-teal-400 focus:outline-none transition-all"
            placeholder="Örn: 1.5"
            required
          />
        </div>
        <div className="md:col-span-3">
          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-300 hover:to-blue-400 text-blue-950 font-bold py-4 rounded-xl shadow-lg hover:shadow-teal-500/50 transition-all duration-300 transform hover:-translate-y-1 text-lg"
          >
            Hesapla & İhtiyacımı Bul
          </button>
        </div>
      </form>

      {result && (
        <div className="bg-blue-900/40 rounded-2xl p-6 border border-blue-400/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h4 className="text-xl font-semibold text-teal-300 mb-4 text-center">Sonuçlar</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-sm text-blue-200 mb-1">Havuz Hacmi</p>
              <p className="text-2xl font-bold text-white">{result.volume.toFixed(1)} m³</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-sm text-blue-200 mb-1">Günlük Klor İhtiyacı</p>
              <p className="text-2xl font-bold text-white">{result.chlorine.toFixed(2)} kg</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-sm text-blue-200 mb-1">0.1 pH Düşürmek İçin</p>
              <p className="text-2xl font-bold text-white">{result.phMinus.toFixed(2)} kg</p>
            </div>
          </div>
          <div className="mt-6 text-center">
            <Link href={`/${countryCode}/store?q=klor`} className="inline-block bg-white text-blue-900 px-8 py-3 rounded-full font-bold shadow-md hover:bg-gray-100 transition-colors mr-4">
              Klor Satın Al
            </Link>
            <Link href={`/${countryCode}/store?q=ph`} className="inline-block bg-white/10 text-white border border-white/30 px-8 py-3 rounded-full font-bold hover:bg-white/20 transition-colors">
              pH Düşürücü Satın Al
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
