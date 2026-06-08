import { NextResponse } from "next/server"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export async function GET() {
    try {
        const response = await fetch(`${BACKEND_URL}/store/faq`, {
            headers: {
                "x-publishable-api-key": PUBLISHABLE_KEY
            },
            next: { revalidate: 3600 } // SSS sayfaları sık değişmez, 1 saat cache
        })
        
        const data = await response.json()
        return NextResponse.json(data, { status: response.status })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
