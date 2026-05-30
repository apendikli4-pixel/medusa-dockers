import { ReactNode } from "react"
import Header from "@/components/Header"

export default async function CountryLayout({
    children,
    params,
}: {
    children: ReactNode
    params: Promise<{ countryCode: string }>
}) {
    const { countryCode } = await params
    return (
        <>
            <Header countryCode={countryCode} />
            <div>{children}</div>
            <footer className="ag-footer">
                <small>© Ayna Genesis — Dürüstlük odaklı AI ticaret altyapısı</small>
            </footer>
        </>
    )
}
