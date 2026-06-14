import { NextResponse } from "next/server"

// Backend /signup public + tenant-agnostic'tir (yeni mağaza henüz tenant/publishable-key'e sahip
// değildir) → proxy header'ı (publishable/tenant) EKLENMEZ; yalnızca gövde iletilir.
const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

export async function POST(req: Request) {
    try {
        const body = await req.json()

        const response = await fetch(`${BACKEND_URL}/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        })

        const data = await response.json()
        return NextResponse.json(data, { status: response.status })
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Sunucu hatası" }, { status: 500 })
    }
}
