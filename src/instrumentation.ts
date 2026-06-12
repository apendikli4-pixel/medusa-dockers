// @ts-ignore
import { NodeSDK } from "@opentelemetry/sdk-node"
// @ts-ignore
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"
// @ts-ignore
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"

/**
 * OpenTelemetry Configuration
 * 
 * Bu dosya uygulama çalışmadan önce (örn: --require ./src/instrumentation.ts)
 * yüklenmelidir. PostgreSQL, Redis, HTTP istekleri ve Express route'larını
 * otomatik olarak izler (auto-instrumentation).
 */

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces"
const serviceName = process.env.OTEL_SERVICE_NAME || "medusa-ayna-genesis"

console.log(`[OpenTelemetry] Başlatılıyor... Endpoint: ${otlpEndpoint}`)

const sdk = new NodeSDK({
    serviceName,
    traceExporter: new OTLPTraceExporter({
        url: otlpEndpoint,
    }),
    instrumentations: [
        getNodeAutoInstrumentations({
            // İzlemek istemediğiniz modülleri burada kapatabilirsiniz
            "@opentelemetry/instrumentation-fs": {
                enabled: false, // Dosya sistemi işlemlerini izleme (çok gürültülü)
            },
            "@opentelemetry/instrumentation-express": {
                enabled: true,
            },
            "@opentelemetry/instrumentation-pg": {
                enabled: true,
            },
            "@opentelemetry/instrumentation-redis-4": {
                enabled: true,
            },
        }),
    ],
})

// Graceful shutdown
process.on("SIGTERM", () => {
    sdk.shutdown()
        .then(() => console.log("[OpenTelemetry] Kapatıldı."))
        .catch((error) => console.log("[OpenTelemetry] Kapatılırken hata:", error))
        .finally(() => process.exit(0))
})

sdk.start()
