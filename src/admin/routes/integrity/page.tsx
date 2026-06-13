// @ts-nocheck
/**
 * Canlı Bütünlük Denetçisi — Admin Paneli
 * ═══════════════════════════════════════
 * Operatörün (Mustafa) kalp atışını CANLI görmesini ve güvenli öz-onarımı tek tıkla
 * tetiklemesini sağlar. Backend: GET /admin/system-health/integrity (durum),
 * POST /admin/system-health/integrity/heal (onar → yeniden-doğrula → dürüst rapor).
 *
 * Tasarım ilkesi: dürüstlük görünür olmalı — her kontrol statüsü ve gerekçesi açıkça gösterilir;
 * "OK" sahte değildir, doğrulanamayan kontrol "SKIPPED" rozetiyle belirtilir.
 */
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Badge, Text, Button } from "@medusajs/ui"
import { Heart, ArrowPath, ShieldCheck } from "@medusajs/icons"
import { useEffect, useState } from "react"

const STATUS_COLOR = { OK: "green", WARN: "orange", FAIL: "red", SKIPPED: "grey" }
const STATUS_LABEL = { OK: "SAĞLIKLI", WARN: "UYARI", FAIL: "BAŞARISIZ", SKIPPED: "ATLANDI" }

const IntegrityPage = () => {
    const [verdict, setVerdict] = useState(null)
    const [loading, setLoading] = useState(true)
    const [healing, setHealing] = useState(false)
    const [healReport, setHealReport] = useState(null)

    const load = async () => {
        setLoading(true)
        setHealReport(null)
        try {
            const res = await fetch("/admin/system-health/integrity", { credentials: "include" })
            setVerdict(await res.json())
        } catch (e) {
            console.error("Bütünlük durumu alınamadı", e)
        } finally {
            setLoading(false)
        }
    }

    const heal = async () => {
        setHealing(true)
        try {
            const res = await fetch("/admin/system-health/integrity/heal", { method: "POST", credentials: "include" })
            const data = await res.json()
            setHealReport(data.heal)
            setVerdict(data.after)
        } catch (e) {
            console.error("Öz-onarım çalıştırılamadı", e)
        } finally {
            setHealing(false)
        }
    }

    useEffect(() => { load() }, [])

    const overall = verdict?.overall
    const hasFail = (verdict?.counts?.fail ?? 0) > 0

    return (
        <Container className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Heart className="text-rose-500 w-8 h-8" />
                    <Heading level="h1">Canlı Bütünlük Denetçisi</Heading>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" size="small" onClick={load} disabled={loading || healing}>
                        <ArrowPath /> Yeniden Tara
                    </Button>
                    <Button variant="primary" size="small" onClick={heal} disabled={loading || healing || !hasFail}>
                        <ShieldCheck /> {healing ? "Onarılıyor..." : "Güvenli Onarımı Çalıştır"}
                    </Button>
                </div>
            </div>

            {loading ? (
                <Text className="text-ui-fg-muted">Yükleniyor...</Text>
            ) : verdict ? (
                <>
                    {/* Genel karar */}
                    <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6 mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Badge color={STATUS_COLOR[overall] ?? "grey"}>{STATUS_LABEL[overall] ?? overall}</Badge>
                            <Text className="text-ui-fg-base font-medium">{verdict.summary}</Text>
                        </div>
                        <Text className="text-ui-fg-muted text-sm">
                            {verdict.counts.ok} OK · {verdict.counts.warn} uyarı · {verdict.counts.fail} başarısız · {verdict.counts.skipped} atlandı
                            {verdict.checkedAt ? ` — ${new Date(verdict.checkedAt).toLocaleString("tr-TR")}` : ""}
                        </Text>
                    </div>

                    {/* Öz-onarım raporu (varsa) */}
                    {healReport && (
                        <div className="bg-ui-bg-subtle border border-ui-border-base rounded-lg p-4 mb-6">
                            <Text className="font-medium mb-1">Öz-onarım sonucu</Text>
                            <Text className="text-ui-fg-muted text-sm">
                                Düzeltildi (doğrulandı): {healReport.fixed.length ? healReport.fixed.join(", ") : "—"} ·
                                Çözülemedi: {healReport.unresolved.length ? healReport.unresolved.join(", ") : "—"}
                            </Text>
                        </div>
                    )}

                    {/* Kontrol satırları */}
                    <div className="bg-ui-bg-base border border-ui-border-base rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-ui-bg-subtle border-b border-ui-border-base text-ui-fg-muted">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Durum</th>
                                    <th className="px-6 py-3 font-semibold">Kontrol</th>
                                    <th className="px-6 py-3 font-semibold w-full">Açıklama</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ui-border-base">
                                {verdict.checks.map((c) => (
                                    <tr key={c.id} className="hover:bg-ui-bg-subtle transition-colors">
                                        <td className="px-6 py-4"><Badge color={STATUS_COLOR[c.status] ?? "grey"}>{STATUS_LABEL[c.status] ?? c.status}</Badge></td>
                                        <td className="px-6 py-4 text-ui-fg-base">{c.title}</td>
                                        <td className="px-6 py-4 text-ui-fg-muted">{c.detail}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Text className="text-ui-fg-muted text-xs mt-4">
                        Saatlik otomatik kalp atışı her zaman çalışır (yalnızca tespit + rapor). Otomatik onarımın
                        kendiliğinden çalışması için sunucuda <code>INTEGRITY_AUTOHEAL=true</code> ayarlanmalıdır;
                        aksi halde onarım yalnızca buradaki düğmeyle (manuel) tetiklenir.
                    </Text>
                </>
            ) : (
                <Text className="text-ui-fg-muted">Bütünlük durumu alınamadı.</Text>
            )}
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "Bütünlük Denetçisi",
    icon: Heart,
})

export default IntegrityPage
