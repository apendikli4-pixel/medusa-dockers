"use client"

import { useActionState, useState } from "react"
import { motion } from "framer-motion"
import { selectShippingAction, type CheckoutFormState } from "@/actions/checkout"
import { formatPrice } from "@/lib/format"
import type { ShippingOption } from "@/lib/server/checkout"
import { Truck, Package, FastForward, CheckCircle2 } from "lucide-react"

const initial: CheckoutFormState = {}

function getShippingIcon(name: string) {
    const l = name.toLowerCase()
    if (l.includes("hızlı") || l.includes("express")) return <FastForward size={24} />
    if (l.includes("standart") || l.includes("yurtiçi")) return <Truck size={24} />
    return <Package size={24} />
}

export default function DeliveryForm({
    countryCode,
    options,
    currency,
    selectedId,
}: {
    countryCode: string
    options: ShippingOption[]
    currency: string
    selectedId?: string
}) {
    const [state, action, pending] = useActionState(selectShippingAction, initial)
    const [chosen, setChosen] = useState(selectedId || options[0]?.id || "")

    return (
        <form action={action} className="animate-fade-in-up mt-4">
            {options.length === 0 ? (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl">
                    Bu bölgeye uygun kargo seçeneği bulunamadı. Lütfen adresinizi kontrol edin.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {options.map((o) => (
                        <label
                            key={o.id}
                            className={`relative cursor-pointer rounded-2xl border-2 p-5 flex flex-col gap-3 transition-all duration-300 ${
                                chosen === o.id 
                                    ? "border-blue-500 bg-blue-50/50 shadow-md transform scale-[1.02]" 
                                    : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                            }`}
                        >
                            <input
                                type="radio"
                                name="option_id"
                                value={o.id}
                                checked={chosen === o.id}
                                onChange={() => setChosen(o.id)}
                                className="sr-only"
                            />
                            
                            <div className="flex items-start justify-between">
                                <div className={`p-2.5 rounded-xl ${chosen === o.id ? "bg-blue-500 text-white shadow-inner" : "bg-gray-100 text-gray-500"}`}>
                                    {getShippingIcon(o.name)}
                                </div>
                                {chosen === o.id && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-blue-500">
                                        <CheckCircle2 size={24} fill="currentColor" className="text-white" />
                                    </motion.div>
                                )}
                            </div>

                            <div className="mt-2">
                                <h3 className="font-heading font-bold text-gray-900 text-lg">{o.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">Tahmini teslimat 1-3 iş günü</p>
                            </div>

                            <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                                <span className="font-medium text-gray-900">
                                    {o.amount > 0 ? formatPrice(o.amount, currency) : "Ücretsiz Kargo"}
                                </span>
                            </div>
                        </label>
                    ))}
                </div>
            )}

            <input type="hidden" name="countryCode" value={countryCode} />

            {state.error && <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl">{state.error}</div>}

            <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-100">
                <button
                    type="submit"
                    disabled={pending || !chosen}
                    className="px-8 py-3.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                    {pending ? "İşleniyor…" : "Ödemeye Geç"}
                </button>
            </div>
        </form>
    )
}
