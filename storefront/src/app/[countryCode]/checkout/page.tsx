import Link from "next/link"
import { redirect } from "next/navigation"
import {
    retrieveCheckoutCart,
    listShippingOptions,
} from "@/lib/server/checkout"
import { retrieveCustomer } from "@/lib/server/customer"
import { formatPrice } from "@/lib/format"
import CheckoutSteps from "@/components/checkout/CheckoutSteps"
import CheckoutSummary from "@/components/checkout/CheckoutSummary"
import AddressForm from "@/components/checkout/AddressForm"
import DeliveryForm from "@/components/checkout/DeliveryForm"
import PaymentForm from "@/components/checkout/PaymentForm"
import PlaceOrderForm from "@/components/checkout/PlaceOrderForm"

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
            <main className="ag-page">
                <div className="ag-empty">
                    <p>Sepetiniz boş.</p>
                    <Link href={`/${countryCode}`} className="ag-link">
                        Alışverişe başla →
                    </Link>
                </div>
            </main>
        )
    }

    const customer = await retrieveCustomer()
    const addrDefaults = {
        email: cart.email || customer?.email || "",
        first_name:
            (cart.shipping_address?.first_name as string) ||
            customer?.first_name ||
            "",
        last_name:
            (cart.shipping_address?.last_name as string) ||
            customer?.last_name ||
            "",
        address_1: (cart.shipping_address?.address_1 as string) || "",
        city: (cart.shipping_address?.city as string) || "",
        postal_code: (cart.shipping_address?.postal_code as string) || "",
        phone: (cart.shipping_address?.phone as string) || customer?.phone || "",
    }

    // Adım önkoşulları (guard)
    const hasAddress = !!cart.shipping_address && !!cart.email
    const hasShipping = (cart.shipping_methods?.length || 0) > 0
    if (
        (step === "delivery" || step === "payment" || step === "review") &&
        !hasAddress
    ) {
        redirect(`/${countryCode}/checkout?step=address`)
    }
    if ((step === "payment" || step === "review") && !hasShipping) {
        redirect(`/${countryCode}/checkout?step=delivery`)
    }

    const options = step === "delivery" ? await listShippingOptions() : []

    return (
        <main className="ag-page">
            <h1 className="ag-checkout-title">Ödeme</h1>
            <CheckoutSteps current={step} />

            <div className="ag-checkout-layout">
                <section className="ag-checkout-main">
                    {step === "address" && (
                        <AddressForm countryCode={countryCode} defaults={addrDefaults} />
                    )}
                    {step === "delivery" && (
                        <DeliveryForm
                            countryCode={countryCode}
                            options={options}
                            currency={cart.currency_code}
                            selectedId={cart.shipping_methods?.[0]?.id}
                        />
                    )}
                    {step === "payment" && <PaymentForm countryCode={countryCode} />}
                    {step === "review" && (
                        <div className="ag-checkout-form">
                            <h2 className="ag-checkout-step-title">
                                4. Siparişi İncele
                            </h2>
                            <div className="ag-review-block">
                                <h4>Teslimat Adresi</h4>
                                <p>
                                    {cart.shipping_address?.first_name as string}{" "}
                                    {cart.shipping_address?.last_name as string}
                                    <br />
                                    {cart.shipping_address?.address_1 as string}
                                    <br />
                                    {cart.shipping_address?.postal_code as string}{" "}
                                    {cart.shipping_address?.city as string}
                                    <br />
                                    {cart.shipping_address?.phone as string}
                                </p>
                                <Link
                                    href={`/${countryCode}/checkout?step=address`}
                                    className="ag-link"
                                >
                                    Düzenle
                                </Link>
                            </div>
                            <div className="ag-review-block">
                                <h4>Kargo</h4>
                                <p>
                                    {cart.shipping_methods?.[0]?.name || "—"} —{" "}
                                    {formatPrice(
                                        cart.shipping_methods?.[0]?.amount || 0,
                                        cart.currency_code
                                    )}
                                </p>
                                <Link
                                    href={`/${countryCode}/checkout?step=delivery`}
                                    className="ag-link"
                                >
                                    Düzenle
                                </Link>
                            </div>
                            <div className="ag-review-block">
                                <h4>Ödeme</h4>
                                <p>Kapıda Ödeme / Havale</p>
                            </div>
                            <PlaceOrderForm countryCode={countryCode} />
                        </div>
                    )}
                </section>

                <CheckoutSummary cart={cart} />
            </div>
        </main>
    )
}
