// @ts-nocheck
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Badge, Button, Text, toast } from "@medusajs/ui"
import { ShieldCheck, ArrowPath } from "@medusajs/icons"
import { useEffect, useState } from "react"

/**
 * Dürüstlük & Şeffaflık Raporu (Admin)
 * TÜM sayılar /admin/transparency-report'tan, GERÇEK veriden gelir — uydurma yok.
 * Kaynak okunamazsa "veri yok" gösterilir, sahte değer üretilmez.
 */
const TransparencyReportPage = () => {
    const [report, setReport] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)

    const load = (d: number) => {
        setLoading(true)
        fetch(`/admin/transparency-report?days=${d}`, { credentials: "include" })
            .then((r) => r.json())
            .then((data) => setReport(data.report))
            .catch(() => toast.error("Rapor yüklenemedi"))
            .finally(() => setLoading(false))
    }
    useEffect(() => { load(days) }, [days])

    const Stat = ({ label, value, hint, tone = "base" }: any) => (
        <div className="flex flex-col gap-1 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
            <Text size="small" className="text-ui-fg-subtle">{label}</Text>
            <span
                className="text-3xl font-semibold"
                style={{ color: tone === "danger" ? "#e11d48" : tone === "ok" ? "#16a34a" : "var(--fg-base, #111)" }}
            >
                {value}
            </span>
            {hint ? <Text size="xsmall" className="text-ui-fg-muted">{hint}</Text> : null}
        </div>
    )

    const c = report?.conscience
    const h = report?.honesty
    const ai = report?.aiEngine

    return (
        <Container className="p-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="text-ui-fg-subtle" />
                    <Heading level="h1">Dürüstlük & Şeffaflık Raporu</Heading>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        className="h-8 rounded-md border border-ui-border-base bg-ui-bg-field px-2 text-sm"
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                    >
                        <option value={7}>Son 7 gün</option>
                        <option value={30}>Son 30 gün</option>
                        <option value={90}>Son 90 gün</option>
                    </select>
                    <Button variant="secondary" size="small" onClick={() => load(days)} isLoading={loading}>
                        <ArrowPath /> Yenile
                    </Button>
                </div>
            </div>

            <div className="px-6 py-3 border-b border-ui-border-base bg-ui-bg-subtle">
                <Text size="small" className="text-ui-fg-subtle">
                    Tüm rakamlar canlı veritabanı ve çalışma-anı kaynaklarından okunur. Uydurma değer yok;
                    bir kaynak boşsa <strong>0</strong> görünür, gizlenmez.
                </Text>
            </div>

            {loading && !report ? (
                <div className="px-6 py-10"><Text className="text-ui-fg-subtle">Yükleniyor…</Text></div>
            ) : !report ? (
                <div className="px-6 py-10"><Text className="text-ui-fg-subtle">Rapor verisi yok.</Text></div>
            ) : (
                <div className="flex flex-col gap-6 px-6 py-6">
                    {/* VİCDAN / ETİK FİLTRE */}
                    <section className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Heading level="h2">Etik Filtre (Vicdan)</Heading>
                            {c?.sourceOk === false && <Badge color="orange">kaynak okunamadı</Badge>}
                            {c?.truncated && <Badge color="grey">kısmi (üst sınır)</Badge>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Stat label="Engellenen eylem (DENY)" value={c?.blockedActions ?? 0} tone="danger"
                                hint="AI'ın etik/güvenlik gerekçesiyle reddettiği işlemler" />
                            <Stat label="Onaylanan eylem" value={c?.allowedActions ?? 0} tone="ok" />
                            <Stat label="Toplam karar" value={c?.totalVerdicts ?? 0} />
                        </div>
                    </section>

                    {/* DÜRÜSTLÜK KAYITLARI */}
                    <section className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Heading level="h2">Gerçeğe Bağlılık</Heading>
                            {h?.sourceOk === false && <Badge color="orange">kaynak okunamadı</Badge>}
                            {h?.truncated && <Badge color="grey">kısmi (üst sınır)</Badge>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Stat label="Gerçek ürün verisine bağlı yanıt" value={h?.groundedProductAnswers ?? 0} tone="ok"
                                hint="AI'ın fiyat/stok'u uydurmayıp DB'den doğruladığı kayıtlar" />
                            <Stat label="Kaydedilen toplam AI eylemi" value={h?.totalTruthRecords ?? 0} />
                            <Stat label="Reddedilen (deny) kaydı" value={h?.denyRecords ?? 0} />
                        </div>
                    </section>

                    {/* AI MOTORU */}
                    <section className="flex flex-col gap-3">
                        <Heading level="h2">AI Motoru (Ollama) Dayanıklılığı</Heading>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Stat
                                label="Durum"
                                value={ai?.state ?? "—"}
                                tone={ai?.available ? "ok" : ai?.state ? "danger" : "base"}
                                hint={ai?.available === null ? "henüz veri yok" : ai?.available ? "erişilebilir" : "devre açık"}
                            />
                            <Stat label="Uptime" value={ai?.availabilityPct === null || ai?.availabilityPct === undefined ? "—" : `%${ai.availabilityPct}`}
                                hint="başarılı / toplam istek" />
                            <Stat label="Başarılı istek" value={ai?.successCount ?? 0} tone="ok" />
                            <Stat label="Başarısız istek" value={ai?.failureCount ?? 0} tone={ai?.failureCount ? "danger" : "base"} />
                        </div>
                    </section>

                    <Text size="xsmall" className="text-ui-fg-muted">
                        Oluşturulma: {report.generatedAt} · Pencere: son {report.windowDays} gün
                    </Text>
                </div>
            )}
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "Şeffaflık Raporu",
    icon: ShieldCheck,
})

export default TransparencyReportPage
