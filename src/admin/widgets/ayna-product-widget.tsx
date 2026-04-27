import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Text, toast } from "@medusajs/ui"
import { Sparkles } from "@medusajs/icons"
import { useState } from "react"

const AynaProductWidget = ({ product }: { product: any }) => {
    const [isLoading, setIsLoading] = useState(false)

    const handleGenerateContent = async () => {
        setIsLoading(true)
        try {
            // Ayna backend rotasına SEO üretme isteği atıyoruz
            const response = await fetch(`/admin/missions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: `SEO İçerik: ${product.title}`,
                    description: `Ayna tarafından ${product.title} için otonom olarak SEO uyumlu blog yazısı üretilmesi.`,
                    priority: "medium",
                    status: "pending",
                    result: {
                        action: "generate_seo_content",
                        product_id: product.id,
                        product_title: product.title
                    }
                }),
            })

            if (!response.ok) {
                throw new Error("Görev oluşturulamadı.")
            }

            toast.success("Ayna Görevi Oluşturuldu!", {
                description: "Missions (Görevler) sekmesinden SEO içerik üretimi görevini onaylayabilirsiniz.",
            })
        } catch (error: any) {
            toast.error("Hata", {
                description: error.message || "Ayna ile iletişim kurulamadı.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Container className="p-6 flex flex-col gap-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="flex items-center gap-x-2 text-xl font-bold">
                        <Sparkles className="text-violet-500" />
                        Ayna Asistan
                    </h2>
                    <Text className="text-ui-fg-subtle mt-1 text-sm">
                        Bu ürün için otomatik SEO uyumlu blog yazısı ve içerik üretin.
                    </Text>
                </div>
                <Button 
                    variant="secondary" 
                    size="small" 
                    onClick={handleGenerateContent}
                    isLoading={isLoading}
                >
                    İçerik Üret (Ayna)
                </Button>
            </div>
        </Container>
    )
}

// Widget'in ürün detay sayfasının neresine yerleşeceğini tanımlarız (Medusa v2 mimarisi)
export const config = defineWidgetConfig({
    zone: "product.details.after",
})

export default AynaProductWidget
