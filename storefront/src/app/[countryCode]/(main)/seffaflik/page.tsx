import { Metadata } from "next"
import { headers } from "next/headers"

export const metadata: Metadata = {
    title: "Şeffaflık & Dürüstlük",
    description: "Yapay zekâ asistanımızın ne kadar gerçeğe bağlı kaldığını kanıtlarıyla gösteriyoruz. Uydurma değer yok; her sayı canlı kayıtlardan.",
}

type Transparency = {
    windowDays: number
    groundedAnswers: number
    blockedActions: number
    totalAiRecords: number
}

async function getTransparency(): Promise<Transparency | null> {
    const baseUrl =
        process.env.MEDUSA_BACKEND_URL ||
        process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
        "http://localhost:9000"
    const apiKey =
        process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
        process.env.MEDUSA_PUBLISHABLE_KEY
    const tenantSlug = (await headers()).get("x-tenant-slug") || "default"
    try {
        const res = await fetch(`${baseUrl}/store/transparency?days=30`, {
            headers: {
                ...(apiKey ? { "x-publishable-api-key": apiKey } : {}),
                "x-tenant-slug": tenantSlug,
            },
            next: { revalidate: 300 },
        })
        if (!res.ok) return null
        const data = await res.json()
        return data.transparency
    } catch {
        return null
    }
}

export default async function TransparencyPage() {
    const t = await getTransparency()

    const Stat = ({ value, label, desc }: { value: number; label: string; desc: string }) => (
        <div className="glass-panel rounded-2xl p-6 text-center premium-shadow">
            <div className="text-4xl md:text-5xl font-bold mb-2" style={{ color: "var(--ag-primary)" }}>
                {value.toLocaleString("tr-TR")}
            </div>
            <div className="font-heading font-semibold text-lg mb-1" style={{ color: "var(--ag-text)" }}>{label}</div>
            <p className="text-sm opacity-70" style={{ color: "var(--ag-text)" }}>{desc}</p>
        </div>
    )

    return (
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 animate-fade-in-up">
            <header className="text-center mb-12">
                <h1 className="font-heading font-bold text-4xl md:text-5xl mb-4 tracking-tight" style={{ color: "var(--ag-text)" }}>
                    Şeffaflık & Dürüstlük
                </h1>
                <div className="w-16 h-1 mx-auto rounded-full mb-6" style={{ background: "var(--ag-primary)" }} />
                <p className="text-lg max-w-2xl mx-auto opacity-80" style={{ color: "var(--ag-text)" }}>
                    Bu platform dürüstlük üzerine kuruludur. Yapay zekâ asistanımız fiyat veya stok bilgisini
                    <strong> asla uydurmaz</strong> — her yanıtı gerçek veritabanı kayıtlarına bağlar. Aşağıdaki sayılar
                    son 30 günün <strong>canlı</strong> kayıtlarındandır; veri yoksa 0 gösterilir, hiçbir değer süslenmez.
                </p>
            </header>

            {t ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        <Stat
                            value={t.groundedAnswers}
                            label="Gerçeğe Bağlı Yanıt"
                            desc="AI'ın fiyat/stok'u uydurmayıp gerçek ürün verisinden doğruladığı yanıt sayısı"
                        />
                        <Stat
                            value={t.blockedActions}
                            label="Engellenen Riskli İşlem"
                            desc="Etik/güvenlik filtresinin reddettiği işlem sayısı"
                        />
                        <Stat
                            value={t.totalAiRecords}
                            label="Kayıt Altına Alınan AI Eylemi"
                            desc="Denetlenebilirlik için iz bırakılan toplam yapay zekâ kararı"
                        />
                    </div>
                    <p className="text-center text-sm opacity-60" style={{ color: "var(--ag-text)" }}>
                        Son {t.windowDays} günün verisi · Ayna AI motorunun dürüstlük karnesi
                    </p>
                </>
            ) : (
                <div className="glass-panel rounded-2xl p-10 text-center premium-shadow">
                    <p className="opacity-80" style={{ color: "var(--ag-text)" }}>
                        Dürüstlük verisi şu an yüklenemedi. Birazdan tekrar deneyin.
                    </p>
                </div>
            )}

            <section className="mt-16 glass-panel rounded-3xl p-8 md:p-10 premium-shadow">
                <h2 className="font-heading font-bold text-2xl mb-4" style={{ color: "var(--ag-text)" }}>
                    Neden bunu gösteriyoruz?
                </h2>
                <p className="opacity-80 leading-relaxed" style={{ color: "var(--ag-text)" }}>
                    Çoğu mağaza stok saklar, sahte indirim gösterir, sizi yönlendiren öneriler yapar. Biz tam tersini
                    seçtik: yapay zekâ asistanımız bir ürünün gerçekten size uygun olmadığını düşünüyorsa bunu
                    dürüstçe söyler. Bu sayfa, o sözün <strong>kanıtıdır</strong> — pazarlama değil, ölçülen gerçek.
                </p>
            </section>
        </main>
    )
}
