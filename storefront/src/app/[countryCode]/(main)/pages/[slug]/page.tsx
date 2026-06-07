import { notFound } from "next/navigation"
import { Metadata } from "next"
import { renderContent } from "@/lib/markdown"

async function getPageBySlug(slug: string) {
    // Server-side fetch: Docker internal host (MEDUSA_BACKEND_URL) önceliklidir;
    // NEXT_PUBLIC_* tarayıcı içindir ve container'da localhost'a (yanlış host) çözülür.
    const baseUrl =
        process.env.MEDUSA_BACKEND_URL ||
        process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
        "http://localhost:9000"
    const apiKey =
        process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
        process.env.MEDUSA_PUBLISHABLE_KEY

    try {
        const res = await fetch(`${baseUrl}/store/pages/${slug}`, {
            headers: apiKey ? { "x-publishable-api-key": apiKey } : {},
            next: { revalidate: 60 } // Cache for 60 seconds
        })

        if (!res.ok) {
            return null
        }

        const data = await res.json()
        return data.page
    } catch (e) {
        return null
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>
}): Promise<Metadata> {
    const { slug } = await params
    const page = await getPageBySlug(slug)

    if (!page) {
        return { title: "Sayfa Bulunamadı" }
    }

    return {
        title: page.seo_title || page.title,
        description: page.seo_description || "",
    }
}

export default async function CMSPage({
    params,
}: {
    params: Promise<{ countryCode: string; slug: string }>
}) {
    const { slug } = await params
    const page = await getPageBySlug(slug)

    if (!page) {
        notFound()
    }

    return (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 animate-fade-in-up">
            <article className="glass-panel rounded-3xl p-8 md:p-12 premium-shadow">
                <header className="mb-10 text-center">
                    <h1
                        className="font-heading font-bold text-4xl md:text-5xl mb-4 tracking-tight"
                        style={{ color: "var(--ag-text)" }}
                    >
                        {page.title}
                    </h1>
                    <div
                        className="w-16 h-1 mx-auto rounded-full"
                        style={{ background: "var(--ag-primary)" }}
                    ></div>
                </header>
                
                {/* 
                  Since we allow HTML content from the CMS, we use dangerouslySetInnerHTML. 
                  In a production setting, this should be sanitized, but as it's from our own Admin CMS, it's generally safe.
                  We use the Tailwind Typography 'prose' class for perfect text styling.
                */}
                <div
                    className="prose prose-slate prose-lg max-w-none prose-headings:font-heading prose-headings:text-slate-900 prose-a:text-[#c2410c] hover:prose-a:text-slate-900 prose-a:transition-colors"
                    dangerouslySetInnerHTML={{ __html: renderContent(page.content || "") }}
                />
            </article>
        </main>
    )
}
