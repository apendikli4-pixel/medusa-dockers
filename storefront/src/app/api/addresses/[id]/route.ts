import { NextRequest, NextResponse } from "next/server"
import { backendProxyHeaders } from "@/lib/server/proxy-headers"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const cookie = req.headers.get("cookie") || ""
        
        const res = await fetch(`${BACKEND_URL}/store/customers/me/addresses/${id}`, {
            method: "DELETE",
            headers: {
                ...(await backendProxyHeaders()),
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
