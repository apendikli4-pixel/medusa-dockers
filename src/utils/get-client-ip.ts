/**
 * HTTP isteğinden gerçek istemci IP adresini çeker.
 *
 * Öncelik sırası:
 * 1. `x-forwarded-for` — proxy zincirinin ilk (gerçek) IP'si
 * 2. `x-real-ip` — reverse proxy tarafından iletilen IP
 * 3. `cf-connecting-ip` — Cloudflare CDN üzerinden gelen IP
 * 4. Hiçbir header yoksa `"127.0.0.1"` fallback değeri
 *
 * @param context - Medusa InitiatePaymentInput.context nesnesi
 * @returns Gerçek istemci IP adresi veya fallback "127.0.0.1"
 */
export function getClientIp(context: any): string {
  const headers = context?.headers || context?.req?.headers || {}
  const forwarded = headers["x-forwarded-for"]
  if (forwarded) {
    return (typeof forwarded === "string" ? forwarded : forwarded[0])
      .split(",")[0].trim()
  }
  return headers["x-real-ip"] || headers["cf-connecting-ip"] || "127.0.0.1"
}
