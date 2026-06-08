import Link from "next/link"
import { redirect } from "next/navigation"
import {
    retrieveCheckoutCart,
    listShippingOptions,
} from "@/lib/server/checkout"
import { retrieveCustomer } from "@/lib/server/customer"
import { formatPrice } from "@/lib/format"
import CheckoutSummary from "@/components/checkout/CheckoutSummary"
import AddressForm from "@/components/checkout/AddressForm"
import DeliveryForm from "@/components/checkout/DeliveryForm"
import PaymentForm from "@/components/checkout/PaymentForm"
import PlaceOrderForm from "@/components/checkout/PlaceOrderForm"
import { ShieldCheck, Lock, Sparkles, CheckCircle2 } from "lucide-react"

type Step = "address" | "delivery" | "payment" | "review"

export default async function CheckoutPage({
    params,
    searchParams,
}: {
    params: Promise<{ countryCode: string }>
    searchParams: Promise<{ step?: string }>
}) {
    const { countryCode } = await params
    const { step: stepParam } = await searchParams
    const step: Step = (
        ["address", "delivery", "payment", "review"].includes(stepParam || "")
            ? stepParam
            : "address"
    ) as Step

    const cart = await retrieveCheckoutCart()

    if (!cart || !cart.items || cart.items.length === 0) {
        return (
            <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-12 rounded-[2rem] shadow-sm border border-gray-100 text-center max-w-md w-full">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-3xl">🛒</span>
                    </div>
                    <h2 className="text-2xl font-heading font-bold text-gray-900 mb-2">Sepetiniz Boş</h2>
                    <p className="text-gray-500 mb-8">Ödeme yapabilmek için sepetinize ürün eklemelisiniz.</p>
                    <Link href={`/${countryCode}`} className="px-8 py-3.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors inline-block w-full">
                        Alışverişe Başla
                    </Link>
                </div>
            </main>
        )
    }

    const customer = await retrieveCustomer()
    const addrDefaults = {
        email: cart.email || customer?.email || "",
        first_name: (cart.shipping_address?.first_name as string) || customer?.first_name || "",
        last_name: (cart.shipping_address?.last_name as string) || customer?.last_name || "",
        address_1: (cart.shipping_address?.address_1 as string) || "",
        city: (cart.shipping_address?.city as string) || "",
        postal_code: (cart.shipping_address?.postal_code as string) || "",
        phone: (cart.shipping_address?.phone as string) || customer?.phone || "",
    }

    // Adım önkoşulları (guard)
    const hasAddress = !!cart.shipping_address && !!cart.email
    const hasShipping = (cart.shipping_methods?.length || 0) > 0
    
    if ((step === "delivery" || step === "payment" || step === "review") && !hasAddress) {
        redirect(`/${countryCode}/checkout?step=address`)
    }
    if ((step === "payment" || step === "review") && !hasShipping) {
        redirect(`/${countryCode}/checkout?step=delivery`)
    }

    const options = step === "delivery" ? await listShippingOptions() : []

    const isAddressDone = hasAddress && step !== "address"
    const isDeliveryDone = hasShipping && step !== "delivery" && step !== "address"

    return (
        <main className="min-h-screen bg-[#f8fafc] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col items-center mb-10">
                    <h1 className="font-heading font-bold text-4xl text-gray-900">Güvenli Ödeme</h1>
                    <p className="text-gray-500 mt-2">Siparişinizi güvenle tamamlayın</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Left Column: Accordion Steps */}
                    <div className="w-full lg:w-2/3 space-y-6">
                        
                        {/* STEP 1: ADDRESS */}
                        <section className={`bg-white rounded-3xl border ${step === "address" ? "border-blue-500 shadow-lg" : "border-gray-200 shadow-sm"} overflow-hidden transition-all duration-500`}>
                            <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isAddressDone ? "bg-green-500 text-white" : step === "address" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                                        {isAddressDone ? <CheckCircle2 size={16} /> : "1"}
                                    </div>
                                    <h2 className="font-heading font-bold text-xl text-gray-900">İletişim & Adres</h2>
                                </div>
                                {isAddressDone && (
                                    <Link href={`/${countryCode}/checkout?step=address`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                                        Düzenle
                                    </Link>
                                )}
                            </div>
                            
                            <div className={`transition-all duration-500 ease-in-out ${step === "address" ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
                                <div className="p-6">
                                    {step === "address" && <AddressForm countryCode={countryCode} defaults={addrDefaults} />}
                                </div>
                            </div>
                            
                            {isAddressDone && (
                                <div className="p-6 text-sm text-gray-600 flex flex-col gap-1">
                                    <p className="font-medium text-gray-900">{cart.shipping_address?.first_name as string} {cart.shipping_address?.last_name as string}</p>
                                    <p>{cart.email}</p>
                                    <p>{cart.shipping_address?.address_1 as string}, {cart.shipping_address?.city as string}</p>
                                    <p>{cart.shipping_address?.phone as string}</p>
                                </div>
                            )}
                        </section>

                        {/* STEP 2: DELIVERY */}
                        <section className={`bg-white rounded-3xl border ${step === "delivery" ? "border-blue-500 shadow-lg" : "border-gray-200 shadow-sm"} overflow-hidden transition-all duration-500 ${!hasAddress && step !== "delivery" ? "opacity-50 pointer-events-none" : ""}`}>
                            <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isDeliveryDone ? "bg-green-500 text-white" : step === "delivery" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                                        {isDeliveryDone ? <CheckCircle2 size={16} /> : "2"}
                                    </div>
                                    <h2 className="font-heading font-bold text-xl text-gray-900">Kargo Yöntemi</h2>
                                </div>
                                {isDeliveryDone && (
                                    <Link href={`/${countryCode}/checkout?step=delivery`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                                        Düzenle
                                    </Link>
                                )}
                            </div>
                            
                            <div className={`transition-all duration-500 ease-in-out ${step === "delivery" ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
                                <div className="p-6">
                                    {step === "delivery" && (
                                        <DeliveryForm
                                            countryCode={countryCode}
                                            options={options}
                                            currency={cart.currency_code}
                                            selectedId={cart.shipping_methods?.[0]?.id}
                                        />
                                    )}
                                </div>
                            </div>

                            {isDeliveryDone && (
                                <div className="p-6 text-sm text-gray-600">
                                    <p className="font-medium text-gray-900 flex items-center gap-2">
                                        {cart.shipping_methods?.[0]?.name}
                                        <span className="text-gray-400 font-normal">
                                            — {formatPrice(cart.shipping_methods?.[0]?.amount || 0, cart.currency_code)}
                                        </span>
                                    </p>
                                </div>
                            )}
                        </section>

                        {/* STEP 3: PAYMENT & REVIEW */}
                        <section className={`bg-white rounded-3xl border ${(step === "payment" || step === "review") ? "border-blue-500 shadow-lg" : "border-gray-200 shadow-sm"} overflow-hidden transition-all duration-500 ${!hasShipping && step !== "payment" ? "opacity-50 pointer-events-none" : ""}`}>
                            <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${(step === "payment" || step === "review") ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                                        3
                                    </div>
                                    <h2 className="font-heading font-bold text-xl text-gray-900">Ödeme</h2>
                                </div>
                            </div>
                            
                            <div className={`transition-all duration-500 ease-in-out ${(step === "payment" || step === "review") ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
                                <div className="p-6">
                                    {step === "payment" && <PaymentForm countryCode={countryCode} />}
                                    {step === "review" && (
                                        <div className="space-y-6">
                                            <div className="p-5 bg-blue-50 text-blue-800 rounded-2xl flex items-start gap-3">
                                                <ShieldCheck size={24} className="mt-0.5 shrink-0" />
                                                <p className="text-sm">Siparişinizi tamamlamadan önce bilgilerinizi kontrol edin. Her şey doğruysa siparişi onaylayabilirsiniz.</p>
                                            </div>
                                            <PlaceOrderForm countryCode={countryCode} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Sticky Summary */}
                    <div className="w-full lg:w-1/3 lg:sticky lg:top-8 space-y-6">
                        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
                            <CheckoutSummary cart={cart} />
                        </div>

                        {/* Trust Badges */}
                        <div className="flex items-center justify-center gap-4 text-gray-400 py-4">
                            <div className="flex flex-col items-center gap-1.5" title="256-bit SSL Şifreleme">
                                <Lock size={20} />
                                <span className="text-[0.65rem] uppercase font-bold tracking-wider">SSL Secure</span>
                            </div>
                            <div className="w-px h-8 bg-gray-200"></div>
                            <div className="flex flex-col items-center gap-1.5" title="Yapay Zeka Destekli Altyapı">
                                <Sparkles size={20} />
                                <span className="text-[0.65rem] uppercase font-bold tracking-wider">Ayna AI</span>
                            </div>
                            <div className="w-px h-8 bg-gray-200"></div>
                            <div className="flex flex-col items-center gap-1.5" title="Güvenli Alışveriş">
                                <ShieldCheck size={20} />
                                <span className="text-[0.65rem] uppercase font-bold tracking-wider">Secure</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
