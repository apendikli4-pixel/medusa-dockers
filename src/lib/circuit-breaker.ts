/**
 * Circuit Breaker Pattern — Production-grade dayanıklılık katmanı.
 *
 * Ollama gibi self-hosted AI servisleri kesintiye uğradığında:
 *  1. CLOSED:    Normal çalışma — istekler geçer.
 *  2. OPEN:      Hata eşiği aşıldı — istekler anında reddedilir (fallback).
 *  3. HALF_OPEN: Kurtarma denemesi — tek istek geçirilir, sonuca göre CLOSED/OPEN'a döner.
 *
 * Bu pattern sayesinde:
 *  - Down olan servise yük bindirilmez (cascading failure önlemi)
 *  - Kullanıcıya 30s timeout yerine anında fallback gösterilir
 *  - Servis kendini toparlayınca otomatik normal akışa dönülür
 *
 * @sealed - Bu dosya değiştirilmeden önce GENESIS_PROTOCOL kontrol edin.
 */

export enum CircuitState {
    CLOSED = "CLOSED",       // Normal — istekler geçer
    OPEN = "OPEN",           // Kesik — istekler reddedilir
    HALF_OPEN = "HALF_OPEN", // Deneme — tek istek geçer
}

export interface CircuitBreakerOptions {
    /** Devreyi açmak için gereken ardışık hata sayısı (default: 5) */
    failureThreshold: number
    /** OPEN durumundan HALF_OPEN'a geçiş süresi (ms) (default: 30000) */
    resetTimeoutMs: number
    /** HALF_OPEN'da izin verilen deneme sayısı (default: 1) */
    halfOpenMaxAttempts: number
    /** Timeout olarak kabul edilen süre (ms) (default: 30000) */
    requestTimeoutMs: number
    /** İsteğe bağlı ad (logging için) */
    name: string
    /** Opsiyonel: hata durumunda çağrılacak callback */
    onStateChange?: (from: CircuitState, to: CircuitState) => void
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
    failureThreshold: 5,
    resetTimeoutMs: 30_000,
    halfOpenMaxAttempts: 1,
    requestTimeoutMs: 30_000,
    name: "default",
}

interface CircuitMetrics {
    totalRequests: number
    successCount: number
    failureCount: number
    lastFailureTime: number | null
    consecutiveFailures: number
    stateChanges: number
    lastStateChange: number | null
    openCircuitRejections: number
}

export class CircuitBreaker {
    private state_: CircuitState = CircuitState.CLOSED
    private failureCount_: number = 0
    private lastFailureTime_: number | null = null
    private halfOpenAttempts_: number = 0
    private options_: CircuitBreakerOptions
    private metrics_: CircuitMetrics = {
        totalRequests: 0,
        successCount: 0,
        failureCount: 0,
        lastFailureTime: null,
        consecutiveFailures: 0,
        stateChanges: 0,
        lastStateChange: null,
        openCircuitRejections: 0,
    }

    constructor(options?: Partial<CircuitBreakerOptions>) {
        this.options_ = { ...DEFAULT_OPTIONS, ...options }
    }

    /** Mevcut durum */
    get state(): CircuitState {
        return this.state_
    }

    /** Sağlık metrikleri (monitoring/logging için) */
    get metrics(): Readonly<CircuitMetrics> {
        return { ...this.metrics_ }
    }

    /** Devre kullanılabilir mi? */
    get isAvailable(): boolean {
        if (this.state_ === CircuitState.CLOSED) return true
        if (this.state_ === CircuitState.OPEN) {
            // Reset timeout dolmuşsa HALF_OPEN'a geç
            if (this.shouldAttemptReset_()) {
                this.transitionTo_(CircuitState.HALF_OPEN)
                return true
            }
            return false
        }
        // HALF_OPEN — max deneme aşılmadıysa izin ver
        return this.halfOpenAttempts_ < this.options_.halfOpenMaxAttempts
    }

    /**
     * Bir fonksiyonu circuit breaker koruması altında çalıştırır.
     * Devre OPEN ise CircuitOpenError fırlatır.
     * Timeout aşılırsa hata olarak kaydedilir.
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        this.metrics_.totalRequests++

        if (!this.isAvailable) {
            this.metrics_.openCircuitRejections++
            throw new CircuitOpenError(
                `Circuit breaker [${this.options_.name}] is OPEN. ` +
                `${this.failureCount_} consecutive failures. ` +
                `Will retry in ${this.getRemainingResetTime_()}ms.`
            )
        }

        if (this.state_ === CircuitState.HALF_OPEN) {
            this.halfOpenAttempts_++
        }

        try {
            // Timeout koruması
            const result = await this.withTimeout_(fn)
            this.onSuccess_()
            return result
        } catch (error) {
            this.onFailure_()
            throw error
        }
    }

    /**
     * Manuel olarak devreyi sıfırlar (admin/maintenance için)
     */
    reset(): void {
        this.failureCount_ = 0
        this.halfOpenAttempts_ = 0
        this.lastFailureTime_ = null
        this.transitionTo_(CircuitState.CLOSED)
    }

    // ─── Private ─────────────────────────────────────────────────

    private onSuccess_(): void {
        this.metrics_.successCount++
        this.metrics_.consecutiveFailures = 0

        if (this.state_ === CircuitState.HALF_OPEN) {
            // Deneme başarılı — tam kurtarma
            this.failureCount_ = 0
            this.halfOpenAttempts_ = 0
            this.transitionTo_(CircuitState.CLOSED)
        } else {
            // CLOSED — hata sayacını sıfırla
            this.failureCount_ = 0
        }
    }

    private onFailure_(): void {
        this.failureCount_++
        this.lastFailureTime_ = Date.now()
        this.metrics_.failureCount++
        this.metrics_.consecutiveFailures++
        this.metrics_.lastFailureTime = this.lastFailureTime_

        if (this.state_ === CircuitState.HALF_OPEN) {
            // Deneme başarısız — tekrar OPEN'a dön
            this.halfOpenAttempts_ = 0
            this.transitionTo_(CircuitState.OPEN)
        } else if (this.failureCount_ >= this.options_.failureThreshold) {
            // Eşik aşıldı — devreyi aç
            this.transitionTo_(CircuitState.OPEN)
        }
    }

    private shouldAttemptReset_(): boolean {
        if (!this.lastFailureTime_) return true
        return Date.now() - this.lastFailureTime_ >= this.options_.resetTimeoutMs
    }

    private getRemainingResetTime_(): number {
        if (!this.lastFailureTime_) return 0
        const elapsed = Date.now() - this.lastFailureTime_
        return Math.max(0, this.options_.resetTimeoutMs - elapsed)
    }

    private transitionTo_(newState: CircuitState): void {
        const oldState = this.state_
        if (oldState === newState) return

        this.state_ = newState
        this.metrics_.stateChanges++
        this.metrics_.lastStateChange = Date.now()

        if (newState === CircuitState.HALF_OPEN) {
            this.halfOpenAttempts_ = 0
        }

        this.options_.onStateChange?.(oldState, newState)
    }

    private async withTimeout_<T>(fn: () => Promise<T>): Promise<T> {
        const { requestTimeoutMs } = this.options_

        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new CircuitTimeoutError(
                    `Circuit breaker [${this.options_.name}] request timed out after ${requestTimeoutMs}ms`
                ))
            }, requestTimeoutMs)

            fn()
                .then((result) => {
                    clearTimeout(timer)
                    resolve(result)
                })
                .catch((error) => {
                    clearTimeout(timer)
                    reject(error)
                })
        })
    }
}

/**
 * Devre açıkken fırlatılan hata.
 * Çağıran kod bunu yakalayıp fallback gösterebilir.
 */
export class CircuitOpenError extends Error {
    readonly isCircuitOpen = true

    constructor(message: string) {
        super(message)
        this.name = "CircuitOpenError"
    }
}

/**
 * İstek timeout olduğunda fırlatılan hata.
 */
export class CircuitTimeoutError extends Error {
    readonly isTimeout = true

    constructor(message: string) {
        super(message)
        this.name = "CircuitTimeoutError"
    }
}

// ─── Singleton Registry (servis başına tek instance) ─────────

const registry = new Map<string, CircuitBreaker>()

/**
 * İsme göre circuit breaker döndürür (yoksa oluşturur).
 * Tüm servisler aynı instance'ı paylaşır — durum korunur.
 */
export function getCircuitBreaker(
    name: string,
    options?: Partial<CircuitBreakerOptions>
): CircuitBreaker {
    let cb = registry.get(name)
    if (!cb) {
        cb = new CircuitBreaker({ ...options, name })
        registry.set(name, cb)
    }
    return cb
}

/**
 * Tüm circuit breaker'ların durumunu döndürür (monitoring endpoint için).
 */
export function getAllCircuitBreakerStates(): Record<string, {
    state: CircuitState
    metrics: CircuitMetrics
}> {
    const result: Record<string, any> = {}
    for (const [name, cb] of registry) {
        result[name] = {
            state: cb.state,
            metrics: cb.metrics,
        }
    }
    return result
}
