import { redirect } from "next/navigation"
import { retrieveCustomer, listCustomerAddresses } from "@/lib/server/customer"
import AddressBook from "@/components/AddressBook"

export const metadata = {
    title: "Adreslerim - Ayna Genesis",
    description: "Teslimat ve fatura adreslerinizi yönetin.",
}

export default async function AddressesPage({ params }: { params: Promise<{ countryCode: string }> }) {
    const { countryCode } = await params
    const customer = await retrieveCustomer()

    if (!customer) {
        redirect(`/${countryCode}/account/login`)
    }

    const addresses = await listCustomerAddresses()

    return (
        <div className="w-full">
            <AddressBook initialAddresses={addresses} countryCode={countryCode} />
        </div>
    )
}
