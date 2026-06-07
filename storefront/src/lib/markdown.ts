/**
 * Hafif Markdown → HTML dönüştürücü (bağımlılıksız).
 *
 * Blog içerikleri için yeterli: başlıklar, paragraflar, listeler, kalın/italik,
 * linkler, satır içi kod, blockquote, yatay çizgi.
 *
 * GÜVENLİK: Önce tüm girdi HTML-escape edilir (XSS koruması), sonra yalnızca
 * bilinen markdown desenleri güvenli HTML'e çevrilir. Ham HTML enjeksiyonu olmaz.
 */

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

/** Satır içi markdown: kalın, italik, kod, link. (Girdi zaten escape edilmiş olmalı.) */
function inline(text: string): string {
    return text
        // link [metin](url) — yalnızca http(s) ve göreli yollar
        .replace(
            /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g,
            '<a href="$2" class="ag-blog-link" target="_blank" rel="noopener noreferrer">$1</a>'
        )
        // kalın **metin**
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        // italik *metin*
        .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
        // satır içi kod `kod`
        .replace(/`([^`]+)`/g, "<code>$1</code>")
}

/**
 * Markdown metnini blok blok HTML'e çevirir.
 */
export function markdownToHtml(md: string): string {
    if (!md) return ""
    const src = escapeHtml(md.replace(/\r\n/g, "\n"))
    const lines = src.split("\n")
    const out: string[] = []
    let inList = false
    let inPara: string[] = []

    const flushPara = () => {
        if (inPara.length) {
            out.push(`<p>${inline(inPara.join(" "))}</p>`)
            inPara = []
        }
    }
    const closeList = () => {
        if (inList) {
            out.push("</ul>")
            inList = false
        }
    }

    for (const raw of lines) {
        const line = raw.trimEnd()

        // boş satır → paragraf/list sonu
        if (!line.trim()) {
            flushPara()
            closeList()
            continue
        }

        // başlıklar ## ### vb.
        const h = line.match(/^(#{1,6})\s+(.*)$/)
        if (h) {
            flushPara()
            closeList()
            const level = Math.min(h[1].length + 1, 6) // h1'i hero kullanıyor → ## = h2
            out.push(`<h${level}>${inline(h[2].trim())}</h${level}>`)
            continue
        }

        // yatay çizgi
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
            flushPara()
            closeList()
            out.push("<hr/>")
            continue
        }

        // blockquote
        if (/^>\s?/.test(line)) {
            flushPara()
            closeList()
            out.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`)
            continue
        }

        // liste öğesi - * +  veya  1.
        const li = line.match(/^\s*([-*+]|\d+\.)\s+(.*)$/)
        if (li) {
            flushPara()
            if (!inList) {
                out.push("<ul>")
                inList = true
            }
            out.push(`<li>${inline(li[2].trim())}</li>`)
            continue
        }

        // normal metin → paragrafa ekle
        closeList()
        inPara.push(line.trim())
    }

    flushPara()
    closeList()
    return out.join("\n")
}

/** İçerik markdown değil de HTML mi? (AI bazen doğrudan HTML üretiyor.) */
export function looksLikeHtml(s: string): boolean {
    if (!s) return false
    return /<\/?(p|h[1-6]|div|ul|ol|li|br|strong|em|a|blockquote|img|html|body|section|article|span)\b/i.test(s)
}

/**
 * AI'nin ürettiği (bazen tam <html><head><body> sarmallı) HTML'i temizler:
 * doküman sarmalını ve <head>/<title>'ı atar, <script>/<style> ve inline
 * event handler'ları (XSS) kaldırır. Geriye güvenli gövde HTML'i kalır.
 */
export function sanitizeBlogHtml(raw: string): string {
    if (!raw) return ""
    let html = raw
    html = html.replace(/<head[\s\S]*?<\/head>/gi, "")        // <head>…</head>
    html = html.replace(/<\/?(?:html|body|head|title|!doctype)[^>]*>/gi, "") // sarmal etiketler
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "")    // script blokları
    html = html.replace(/<style[\s\S]*?<\/style>/gi, "")      // style blokları
    html = html.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")     // on*="…"
    html = html.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")     // on*='…'
    html = html.replace(/javascript:/gi, "")                  // javascript: protokolü
    return html.trim()
}

/**
 * Blog içeriğini uygun şekilde HTML'e dönüştürür:
 * - İçerik HTML ise → sanitize edilmiş HTML (kaçışsız, gerçek render).
 * - İçerik markdown ise → markdownToHtml.
 */
export function renderContent(content: string): string {
    if (!content) return ""
    return looksLikeHtml(content) ? sanitizeBlogHtml(content) : markdownToHtml(content)
}
