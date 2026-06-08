import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GEÇİCİ MODEL BENCHMARK UCU — model seçimi kararı için.
 * Ollama'ya (dahili) HTTP üzerinden model indirir ve hız/kalite ölçer.
 * Gizli anahtarla korunur. KARAR VERİLDİKTEN SONRA BU DOSYA SİLİNECEK.
 *
 * Aksiyonlar (POST body):
 *   { action: "tags",     secret }                  → yüklü modeller + boyut
 *   { action: "pull",     secret, model }           → modeli arka planda indir (fire-and-forget)
 *   { action: "generate", secret, model, prompt?, num_predict? } → üretim + tok/sn
 *   { action: "tool",     secret, model }           → tool-calling (fonksiyon çağrısı) testi
 */

const BENCH_SECRET = "BENCH_2026_xK9mQ2vL7pR4tZ"
const OLLAMA = process.env.OLLAMA_API_URL || "http://ollama:11434"

// Arka plan pull durum takibi (process ömrü boyunca)
const pullState: Record<string, { status: string; startedAt: number; error?: string }> =
    (globalThis as any).__pullState || ((globalThis as any).__pullState = {})

async function ollamaFetch(path: string, body: any, timeoutMs: number) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        const r = await fetch(`${OLLAMA}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
        })
        const text = await r.text()
        try { return { ok: r.ok, status: r.status, json: JSON.parse(text) } }
        catch { return { ok: r.ok, status: r.status, json: { raw: text.slice(0, 500) } } }
    } finally {
        clearTimeout(timer)
    }
}

/**
 * Modeli stream:true ile indirir. İlerleme satırları aktığı için bağlantı canlı
 * kalır (fetch zaman aşımı olmaz). Son durumu pullState'e yazar.
 */
async function pullStream(model: string) {
    try {
        const r = await fetch(`${OLLAMA}/api/pull`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: model, stream: true }),
        })
        if (!r.ok || !r.body) {
            pullState[model] = { status: "failed", startedAt: pullState[model]?.startedAt || Date.now(), error: `HTTP ${r.status}` }
            return
        }
        const reader = r.body.getReader()
        const decoder = new TextDecoder()
        let last = ""
        let buf = ""
        // Akışı sonuna kadar tüket (her satır bir ilerleme JSON'u).
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            const lines = buf.split("\n")
            buf = lines.pop() || ""
            for (const ln of lines) {
                if (!ln.trim()) continue
                try {
                    const o = JSON.parse(ln)
                    if (o.status) last = o.status
                    if (o.error) {
                        pullState[model] = { status: "failed", startedAt: pullState[model]?.startedAt || Date.now(), error: String(o.error).slice(0, 300) }
                        return
                    }
                } catch { /* kısmi satır */ }
            }
        }
        pullState[model] = {
            status: /success/i.test(last) ? "done" : "done",
            startedAt: pullState[model]?.startedAt || Date.now(),
        }
    } catch (e: any) {
        pullState[model] = { status: "error", startedAt: pullState[model]?.startedAt || Date.now(), error: String(e?.message || e).slice(0, 300) }
    }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const body = (req.body || {}) as any
    if (body.secret !== BENCH_SECRET) {
        return res.status(403).json({ error: "forbidden" })
    }

    const action = body.action

    try {
        if (action === "tags") {
            const controller = new AbortController()
            const t = setTimeout(() => controller.abort(), 20000)
            const r = await fetch(`${OLLAMA}/api/tags`, { signal: controller.signal })
            clearTimeout(t)
            const j = await r.json()
            const models = (j.models || []).map((m: any) => ({
                name: m.name,
                size_gb: m.size ? +(m.size / 1e9).toFixed(2) : null,
            }))
            return res.status(200).json({ models, pulls: pullState })
        }

        if (action === "pull") {
            const model = body.model
            if (!model) return res.status(400).json({ error: "model gerekli" })
            pullState[model] = { status: "downloading", startedAt: Date.now() }
            // Fire-and-forget: indirme arka planda sürer (büyük model = dakikalar).
            // stream:true ŞART → Ollama ilerleme satırlarını sürekli gönderir, böylece
            // Node fetch'in ~5dk başlık/gövde zaman aşımı tetiklenmez (aksi halde "fetch failed").
            pullStream(model).catch(() => {})
            return res.status(202).json({ started: model })
        }

        if (action === "generate") {
            const model = body.model
            const prompt = body.prompt || "Havuz suyu neden bulanıklaşır? Kısaca, sade ve doğru Türkçe ile açıkla."
            if (!model) return res.status(400).json({ error: "model gerekli" })
            const genBody: any = {
                model,
                prompt,
                stream: false,
                // think: düşünen modellerde (qwen3.x) gizli akıl yürütmeyi kapat → hızlı doğrudan cevap.
                think: body.think === true ? true : false,
                options: { temperature: 0.7, num_predict: body.num_predict || 400 },
            }
            const r = await ollamaFetch("/api/generate", genBody, 290_000)
            const j = r.json || {}
            const evalCount = j.eval_count || 0
            const evalDur = j.eval_duration || 0 // ns
            const tokPerSec = evalDur > 0 ? +(evalCount / (evalDur / 1e9)).toFixed(2) : null
            return res.status(200).json({
                model,
                ok: r.ok,
                tokens_per_sec: tokPerSec,
                eval_count: evalCount,
                total_sec: j.total_duration ? +(j.total_duration / 1e9).toFixed(2) : null,
                load_sec: j.load_duration ? +(j.load_duration / 1e9).toFixed(2) : null,
                thinking: (j.thinking || "").slice(0, 300),
                response: (j.response || j.raw || "").slice(0, 1500),
            })
        }

        if (action === "tool") {
            // Admin AI'nın ihtiyacı: model fonksiyon çağrısı (tool_calls) üretebiliyor mu?
            const model = body.model
            if (!model) return res.status(400).json({ error: "model gerekli" })
            const r = await ollamaFetch("/api/chat", {
                model,
                stream: false,
                think: body.think === true ? true : false,
                messages: [
                    { role: "user", content: "Klor tableti ürününün fiyatını ve stok durumunu öğren." },
                ],
                tools: [{
                    type: "function",
                    function: {
                        name: "search_product",
                        description: "Ürün adına göre fiyat ve stok bilgisini veritabanından getirir",
                        parameters: {
                            type: "object",
                            properties: { query: { type: "string", description: "Ürün adı" } },
                            required: ["query"],
                        },
                    },
                }],
                options: { temperature: 0.2, num_predict: 200 },
            }, 290_000)
            const j = r.json || {}
            const toolCalls = j.message?.tool_calls || []
            return res.status(200).json({
                model,
                ok: r.ok,
                tool_call_made: toolCalls.length > 0,
                tool_calls: toolCalls,
                content: (j.message?.content || j.raw || "").slice(0, 600),
            })
        }

        return res.status(400).json({ error: "bilinmeyen action", valid: ["tags", "pull", "generate", "tool"] })
    } catch (e: any) {
        return res.status(200).json({ error: String(e?.message || e).slice(0, 400) })
    }
}
