import { NextRequest, NextResponse } from "next/server"
import { backendProxyHeaders } from "@/lib/server/proxy-headers"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

export async function GET(req: NextRequest) {
    try {
        const cookie = req.headers.get("cookie") || ""
        
        const res = await fetch(`${BACKEND_URL}/store/customers/me/addresses`, {
            method: "GET",
            headers: {
                ...(await backendProxyHeaders()),
                "cookie": cookie,
            },
        })
        
        if (!res.ok) {
            return NextResponse.json({ error: "Adresler alınamadı", details: await res.text() }, { status: res.status })
        }
        
        const data = await res.json()
        return NextResponse.json(data)
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const cookie = req.headers.get("cookie") || ""
        const body = await req.json()
        
        const res = await fetch(`${BACKEND_URL}/store/customers/me/addresses`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(await backendProxyHeaders()),
                "cookie": cookie,
            },
            body: JSON.stringify(body),
        })
        
        if (!res.ok) {
            return NextResponse.json({ error: "Adres eklenemedi", details: await res.text() }, { status: res.status })
        }
        
        const data = await res.json()
        return NextResponse.json(data)
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
