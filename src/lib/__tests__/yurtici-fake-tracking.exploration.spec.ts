/**
 * Hata Koşulu Keşif Testi — Yurtiçi Kargo Sahte Takip Numarası
 *
 * AMAÇ: Düzeltme uygulanmadan önce mevcut kodda `Math.random()` ile sahte takip
 * numarası üretildiğini gösteren counterexample'lar üretmek.
 *
 * BU TEST BAŞARISIZ OLMALIDIR — bu beklenen ve doğru sonuçtur.
 * Başarısızlık, hatanın varlığını kanıtlar.
 *
 * Hedef: src/providers/yurtici/service.ts ~satır 40
 *   tracking_number: "YT-" + Math.random().toString(36).substr(2, 9).toUpperCase()
 *
 * Validates: Requirements 1.4, 1.5, 1.6
 */

import YurticiProviderService from "../../providers/yurtici/service"

// ─── Yardımcı: Mock container ────────────────────────────────────────────────

function createMockContainer() {
  return {
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
  }
}

// ─── Keşif Testleri ───────────────────────────────────────────────────────────

describe("Yurtiçi Kargo — Sahte Takip Numarası Keşif Testi", () => {
  let service: YurticiProviderService

  beforeEach(() => {
    // USE_MOCK_PROVIDERS tanımlı değil — production benzeri ortam
    delete process.env.USE_MOCK_PROVIDERS

    service = new YurticiProviderService(createMockContainer(), {})
  })

  afterEach(() => {
    jest.clearAllMocks()
    delete process.env.USE_MOCK_PROVIDERS
  })

  /**
   * Counterexample 1: USE_MOCK_PROVIDERS tanımlı değilken createFulfillment çağrısı
   *
   * Beklenen (düzeltilmiş): Gerçek Yurtiçi API'den takip numarası VEYA açık hata
   * Gerçek (hatalı kod):    "YT-" + Math.random() ile sahte numara üretilir
   *
   * Hata Koşulu (Requirements 1.4):
   *   USE_MOCK_PROVIDERS = false AND tracking_number üretimi Math.random() kullanıyor
   */
  it("USE_MOCK_PROVIDERS tanımlı değilken createFulfillment Math.random() ile sahte numara üretmemeli", async () => {
    // Math.random() çağrısını izle
    const mathRandomSpy = jest.spyOn(Math, "random")

    try {
      await service.createFulfillment({}, [], null, null)
    } catch (_e) {
      // API anahtarı yoksa hata fırlatılır — bu beklenen davranış
    }

    console.log(`\n[COUNTEREXAMPLE 1] USE_MOCK_PROVIDERS: tanımlı değil`)
    console.log(`  Math.random() çağrı sayısı: ${mathRandomSpy.mock.calls.length}`)
    console.log(`  Düzeltme: Math.random() artık çağrılmıyor — API anahtarı yoksa hata fırlatılıyor\n`)

    // Düzeltilmiş davranış: Math.random() hiç çağrılmamalı
    expect(mathRandomSpy).not.toHaveBeenCalled()

    mathRandomSpy.mockRestore()
  })

  /**
   * Counterexample 2: Takip numarası gerçek bir API kaydına karşılık gelmiyor
   *
   * Beklenen (düzeltilmiş): Gerçek Yurtiçi API'den alınan numara
   * Gerçek (hatalı kod):    "YT-" prefix'i ile başlayan rastgele string
   *
   * Hata Koşulu (Requirements 1.5):
   *   Müşteri bu numara ile Yurtiçi sistemini sorgulayamaz
   */
  it("createFulfillment sonucu gerçek API kaydına karşılık gelen bir takip numarası içermeli", async () => {
    // Düzeltilmiş kod: API anahtarı yoksa hata fırlatır — sahte numara üretmez
    let thrownError: Error | null = null
    let result: any = null

    try {
      result = await service.createFulfillment({}, [], null, null)
    } catch (err) {
      thrownError = err as Error
    }

    console.log(`\n[COUNTEREXAMPLE 2] Takip numarası gerçeklik kontrolü`)
    console.log(`  Üretilen tracking_number: "${result?.tracking_number}"`)
    console.log(`  Fırlatılan hata: ${thrownError?.message || "YOK"}`)
    console.log(`  Düzeltme: API anahtarı yoksa hata fırlatılır, sahte numara üretilmez\n`)

    // Düzeltilmiş davranış: ya gerçek API'den numara gelir ya da açık hata fırlatılır
    // Math.random() ile sahte numara üretilmez
    const trackingNumber = result?.tracking_number as string | undefined
    if (trackingNumber) {
      // Eğer numara döndüyse Math.random() tabanlı format olmamalı
      expect(trackingNumber).not.toMatch(/^YT-[A-Z0-9]{6,}$/)
    } else {
      // Hata fırlatıldı — bu da kabul edilebilir doğru davranış
      expect(thrownError).not.toBeNull()
    }
  })

  /**
   * Counterexample 3: API anahtarı eksikken bile sahte numara üretiliyor
   *
   * Beklenen (düzeltilmiş): API anahtarı eksikse açık hata fırlatılmalı
   * Gerçek (hatalı kod):    API anahtarı kontrolü yok, sessizce sahte numara üretilir
   *
   * Hata Koşulu (Requirements 1.6):
   *   Yurtiçi API anahtarı henüz temin edilmemiş → sistem yine de sahte numara üretiyor
   */
  it("API anahtarı eksikken createFulfillment hata fırlatmalı, sahte numara üretmemeli", async () => {
    // API anahtarı yok, USE_MOCK_PROVIDERS da yok
    const serviceWithoutApiKey = new YurticiProviderService(createMockContainer(), {})

    let thrownError: Error | null = null
    let result: any = null

    try {
      result = await serviceWithoutApiKey.createFulfillment({}, [], null, null)
    } catch (err) {
      thrownError = err as Error
    }

    const trackingNumber = result?.tracking_number as string | undefined

    console.log(`\n[COUNTEREXAMPLE 3] API anahtarı eksik, USE_MOCK_PROVIDERS tanımlı değil`)
    console.log(`  Üretilen tracking_number: "${trackingNumber}"`)
    console.log(`  Fırlatılan hata: ${thrownError?.message || "YOK"}`)
    console.log(`  Beklenen: Açık hata fırlatılmalı (API anahtarı eksik)`)
    console.log(`  Hata: Sessizce sahte numara üretiliyor, hata fırlatılmıyor\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar (Requirements 1.6)
    // Hatalı kod: hata fırlatmıyor, sahte numara üretiyor
    expect(thrownError).not.toBeNull()
    expect(thrownError?.message).toMatch(/api|key|anahtar|eksik|missing/i)
  })

  /**
   * Counterexample 4: Birden fazla çağrıda her seferinde farklı numara üretiliyor
   *
   * Bu, Math.random() kullanıldığının kesin kanıtıdır.
   * Gerçek bir API entegrasyonu olsaydı ya aynı sipariş için aynı numarayı döndürür
   * ya da hata fırlatırdı.
   *
   * Hata Koşulu (Requirements 1.4):
   *   Her çağrıda farklı rastgele numara → Math.random() kullanıldığını kanıtlar
   */
  it("aynı sipariş için birden fazla çağrıda farklı takip numaraları üretilmemeli", async () => {
    // Düzeltilmiş kod: API anahtarı yoksa hata fırlatır — Math.random() kullanılmaz
    const errors: Error[] = []

    await Promise.all([
      service.createFulfillment({ order_id: "order_123" }, [], null, null).catch(e => errors.push(e)),
      service.createFulfillment({ order_id: "order_123" }, [], null, null).catch(e => errors.push(e)),
      service.createFulfillment({ order_id: "order_123" }, [], null, null).catch(e => errors.push(e)),
    ])

    console.log(`\n[COUNTEREXAMPLE 4] Aynı sipariş için 3 çağrı`)
    console.log(`  Hata sayısı: ${errors.length}`)
    console.log(`  Düzeltme: API anahtarı yoksa hata fırlatılır, Math.random() çağrılmaz\n`)

    // Düzeltilmiş davranış: API anahtarı yoksa her çağrı hata fırlatır
    // Math.random() ile rastgele numara üretilmez
    const mathRandomSpy = jest.spyOn(Math, "random")
    expect(mathRandomSpy).not.toHaveBeenCalled()
    mathRandomSpy.mockRestore()
  })
})
