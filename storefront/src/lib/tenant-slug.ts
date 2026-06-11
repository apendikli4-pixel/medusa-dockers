/**
 * Host header'ından tenant slug türetir.
 *
 * middleware.ts (sayfa istekleri) ve /api proxy route'ları AYNI mantığı
 * kullanmak ZORUNDA: Next middleware matcher'ı /api'yi atladığı için
 * x-tenant-slug header'ı API route'larına ulaşmaz — oralarda slug bu
 * fonksiyonla Host'tan yeniden türetilir. Mantık ayrışırsa chat gibi API
 * çağrıları sayfadan FARKLI mağazaya çözümlenir (çapraz sektör sızıntısı).
 */
export function deriveTenantSlug(host: string): string {
    let tenantSlug = "default" // Fallback tenant

    // Basit Subdomain çözümleme (örn: aqua-test.localhost:8000 -> aqua-test)
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
        const parts = host.split(".")
        if (parts.length >= 2 && parts[0] !== "localhost" && parts[0] !== "127") {
            tenantSlug = parts[0]
        }
    } else {
        // Prod Domain çözümleme (örn: vozol.141.98.48.155.sslip.io -> vozol)
        const parts = host.split(".")
        if (parts.length >= 3 && parts[0] !== "www") {
            tenantSlug = parts[0]
        }
    }

    return tenantSlug
}
