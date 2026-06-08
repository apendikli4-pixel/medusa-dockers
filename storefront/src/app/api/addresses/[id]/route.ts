import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const cookie = req.headers.get("cookie") || ""
        
        const res = await fetch(`${BACKEND_URL}/store/customers/me/addresses/${id}`, {
            method: "DELETE",
            headers: {
                "x-publishable-api-key": PUBLISHABLE_KEY,
                "cookie": cookie,
            },
        })
        
        if (!res.ok) {
            return NextResponse.json({ error: "Adres silinemedi", details: await res.text() }, { status: res.status })
        }
        
        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
