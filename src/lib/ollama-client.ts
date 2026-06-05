/**
 * ollama-client.ts — Hafif, bağımlılıksız Ollama istemcisi.
 *
 * Gemini (@google/generative-ai) tamamen kaldırıldı. Doğrudan Gemini çağrısı
 * yapan servisler (semantic-cache, memory, tool, conscience, workflows) artık
 * bu paylaşılan istemci üzerinden açık kaynak Ollama modeline gider.
 *
 * Env:
 *   OLLAMA_API_URL      (vars: http://host.docker.internal:11434)
 *   OLLAMA_MODEL_NAME   (vars: qwen2.5:14b)
 *   OLLAMA_EMBED_MODEL  (vars: nomic-embed-text)
 *   OLLAMA_TIMEOUT_MS   (vars: 290000)
 */

const BASE_URL = () => process.env.OLLAMA_API_URL || "http://host.docker.internal:11434"
const MODEL = () => process.env.OLLAMA_MODEL_NAME || "qwen2.5:14b"
const EMBED_MODEL = () => process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text"
const TIMEOUT = () => parseInt(process.env.OLLAMA_TIMEOUT_MS || "290000", 10)

interface OllamaGen {
    response: string
    done: boolean
    prompt_eval_count?: number
    eval_count?: number
}
interface OllamaEmbed {
    embedding: number[]
}

/**
 * Metin üretimi. responseFormat="json" ise Ollama format=json zorlar.
 * Hata durumunda throw eder; çağıran try/catch ile fallback yönetir.
 */
export async function ollamaGenerate(
    prompt: string,
    opts: { temperature?: number; maxTokens?: number; json?: boolean } = {}
): Promise<string> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT())
    try {
        const body: any = {
            model: MODEL(),
            prompt,
            stream: false,
            options: {
                temperature: opts.temperature ?? 0.7,
                num_predict: opts.maxTokens ?? 1000,
            },
        }
        if (opts.json) body.format = "json"

        const res = await fetch(`${BASE_URL()}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
        })
        if (!res.ok) throw new Error(`Ollama ${res.status} ${res.statusText}`)
        const data = (await res.json()) as OllamaGen
        return data.response || ""
    } finally {
        clearTimeout(timer)
    }
}

/**
 * Tek bir metnin embedding vektörünü döner.
 */
export async function ollamaEmbed(text: string): Promise<number[]> {
    const res = await fetch(`${BASE_URL()}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: EMBED_MODEL(), prompt: text }),
    })
    if (!res.ok) throw new Error(`Ollama embed ${res.status} ${res.statusText}`)
    const data = (await res.json()) as OllamaEmbed
    return data.embedding || []
}

/** Ollama erişilebilir mi (servislerin "available" kontrolü için). */
export function ollamaConfigured(): boolean {
    return true // self-hosted, her zaman yapılandırılmış kabul edilir
}
