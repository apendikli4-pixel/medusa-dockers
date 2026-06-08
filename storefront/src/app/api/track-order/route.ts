import { NextResponse } from "next/server"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    const display_id = searchParams.get("display_id")

    if (!email || !display_id) {
        return NextResponse.json({ error: "E-posta ve Sipariş Numarası zorunludur." }, { status: 400 })
    }

    try {
        const url = new URL(`${BACKEND_URL}/store/orders/track`)
        url.searchParams.append("email", email)
        url.searchParams.append("display_id", display_id)

        const response = await fetch(url.toString(), {
            method: "GET",
            headers: {
                "x-publishable-api-key": PUBLISHABLE_KEY,
                "Content-Type": "application/json"
            },
            // Verilerin anlık değişebilme ihtimaline karşı cache süresi kısa tutulur
            next: { revalidate: 0 } 
        })
        
        const data = await response.json()
        return NextResponse.json(data, { status: response.status })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
