/**
 * Koruma Testi — Mevcut Ödeme Akışı Davranışı (DÜZELTME ÖNCESİ)
 *
 * AMAÇ: Düzeltme uygulanmadan önce korunması gereken baseline davranışları doğrular.
 * Bu testler BAŞARILI olmalıdır — hem düzeltme öncesinde hem sonrasında.
 *
 * Korunan Davranışlar:
 * - Requirements 3.1: API anahtarı eksik → sistem başlatılabilir, placeholder döner
 * - Requirements 3.2: Geçerli IP mevcut → ödeme akışı başlatılır
 *
 * Validates: Requirements 3.1, 3.2
 */

// fetch'i global olarak mock'la — gerçek HTTP isteği yapılmasın
const mockFetch = jest.fn()
global.fetch = mockFetch as any

// iyzipay paketini mock'la — kurulu olmayabilir
jest.mock("iyzipay", () => {
  return jest.fn().mockImplementation(() => ({
    checkoutFormInitialize: {
      create: jest.fn((_req: any, cb: Function) => {
        cb(null, {
          status: "success",
          paymentPageUrl: "https://sandbox.iyzipay.com/pay/TOKEN",
          token: "MOCK_TOKEN",
        })
      }),
    },
  }))
}, { virtual: true })

// iyzipay statik sabitleri
const IyzipayMock = require("iyzipay")
IyzipayMock.LOCALE = { TR: "tr" }
IyzipayMock.CURRENCY = { TRY: "TRY" }
IyzipayMock.PAYMENT_GROUP = { PRODUCT: "PRODUCT" }
IyzipayMock.BASKET_ITEM_TYPE = { PHYSICAL: "PHYSICAL" }

import PayTRProvider from "../../providers/paytr/provider"
import IyzicoProvider from "../../providers/iyzico/provider"

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

// ─── Requirements 3.1: Graceful Degradation ──────────────────────────────────

describe("PayTR Provider — API Anahtarı Eksik → Placeholder Response (Requirements 3.1)", () => {
  let provider: PayTRProvider

  beforeEach(() => {
    // Kimlik bilgisi olmadan provider oluştur
    provider = new PayTRProvider(createMockContainer(), {})
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("merchant_id eksik olduğunda placeholder response döndürür", async () => {
    const result = await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {} as any,
    })

    // Sistem çökmemeli, placeholder dönmeli
    expect(result).toBeDefined()
    expect(result.id).toBeDefined()
    expect(result.data).toBeDefined()
  })

  it("placeholder response'da is_placeholder: true alanı bulunur", async () => {
    const result = await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {} as any,
    })

    expect(result.data?.is_placeholder).toBe(true)
  })

  it("placeholder response'da status: pending alanı bulunur", async () => {
    const result = await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {} as any,
    })

    expect(result.data?.status).toBe("pending")
  })

  it("placeholder response'da payment_url alanı bulunur", async () => {
    const result = await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {} as any,
    })

    expect(typeof result.data?.payment_url).toBe("string")
    expect((result.data?.payment_url as string).length).toBeGreaterThan(0)
  })

  it("API çağrısı yapılmaz (fetch çağrılmaz)", async () => {
    await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {} as any,
    })

    // Kimlik bilgisi yokken gerçek API çağrısı yapılmamalı
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe("İyzico Provider — API Anahtarı Eksik → Placeholder Response (Requirements 3.1)", () => {
  let provider: IyzicoProvider

  beforeEach(() => {
    // Kimlik bilgisi olmadan provider oluştur
    provider = new IyzicoProvider(createMockContainer(), {})
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("api_key eksik olduğunda placeholder response döndürür", async () => {
    const result = await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {} as any,
    })

    expect(result).toBeDefined()
    expect(result.id).toBeDefined()
    expect(result.data).toBeDefined()
  })

  it("placeholder response'da is_placeholder: true alanı bulunur", async () => {
    const result = await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {} as any,
    })

    expect(result.data?.is_placeholder).toBe(true)
  })

  it("placeholder response'da status: pending alanı bulunur", async () => {
    const result = await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {} as any,
    })

    expect(result.data?.status).toBe("pending")
  })

  it("placeholder response'da payment_url alanı bulunur", async () => {
    const result = await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {} as any,
    })

    expect(typeof result.data?.payment_url).toBe("string")
    expect((result.data?.payment_url as string).length).toBeGreaterThan(0)
  })
})

// ─── Requirements 3.2: Header Yok → 127.0.0.1 Fallback ──────────────────────

describe("PayTR Provider — Header Yok → 127.0.0.1 Fallback (Requirements 3.2)", () => {
  let provider: PayTRProvider
  let capturedFormData: URLSearchParams | null = null

  beforeEach(() => {
    capturedFormData = null

    mockFetch.mockImplementation(async (_url: string, options: RequestInit) => {
      const body = options?.body as string
      capturedFormData = new URLSearchParams(body)
      return {
        json: async () => ({
          status: "success",
          token: "MOCK_PAYTR_TOKEN",
        }),
      }
    })

    provider = new PayTRProvider(createMockContainer(), {
      merchant_id: "TEST_MERCHANT",
      merchant_key: "TEST_KEY",
      merchant_salt: "TEST_SALT",
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("header olmadan istek yapıldığında 127.0.0.1 fallback kullanılır", async () => {
    await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {
        customer: { email: "test@test.com" },
        // headers yok
      } as any,
    })

    const sentUserIp = capturedFormData?.get("user_ip")

    console.log(`\n[PRESERVATION] PayTR — Header yok`)
    console.log(`  Gönderilen user_ip: "${sentUserIp}"`)
    console.log(`  Beklenen: "127.0.0.1" (fallback — mevcut davranış korunuyor)\n`)

    // Mevcut davranış: header yokken 127.0.0.1 kullanılır
    expect(sentUserIp).toBe("127.0.0.1")
  })

  it("boş headers nesnesi ile istek yapıldığında 127.0.0.1 fallback kullanılır", async () => {
    await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {
        headers: {},
        customer: { email: "test@test.com" },
      } as any,
    })

    const sentUserIp = capturedFormData?.get("user_ip")

    console.log(`\n[PRESERVATION] PayTR — Boş headers`)
    console.log(`  Gönderilen user_ip: "${sentUserIp}"`)
    console.log(`  Beklenen: "127.0.0.1" (fallback — mevcut davranış korunuyor)\n`)

    expect(sentUserIp).toBe("127.0.0.1")
  })

  it("ödeme akışı başarıyla tamamlanır ve geçerli bir id döner", async () => {
    const result = await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {
        customer: { email: "test@test.com" },
      } as any,
    })

    expect(result.id).toBeDefined()
    expect(result.id).toMatch(/^paytr_/)
    expect(result.data?.status).toBe("pending")
  })
})

describe("İyzico Provider — Header Yok → 127.0.0.1 Fallback (Requirements 3.2)", () => {
  let provider: IyzicoProvider
  let capturedBuyerIp: string | null = null

  beforeEach(() => {
    capturedBuyerIp = null

    const IyzipayConstructor = require("iyzipay")
    IyzipayConstructor.mockImplementation(() => ({
      checkoutFormInitialize: {
        create: jest.fn((req: any, cb: Function) => {
          capturedBuyerIp = req?.buyer?.ip || null
          cb(null, {
            status: "success",
            paymentPageUrl: "https://sandbox.iyzipay.com/pay/TOKEN",
            token: "MOCK_TOKEN",
          })
        }),
      },
    }))

    provider = new IyzicoProvider(createMockContainer(), {
      api_key: "TEST_API_KEY",
      secret_key: "TEST_SECRET_KEY",
      base_url: "https://sandbox-api.iyzipay.com",
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("header olmadan istek yapıldığında buyer.ip 127.0.0.1 fallback kullanılır", async () => {
    await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {
        customer: {
          id: "cust_1",
          email: "test@test.com",
          first_name: "Test",
          last_name: "Kullanıcı",
        },
        billing_address: {
          address_1: "Test Sokak",
          city: "Istanbul",
          country_code: "TR",
          postal_code: "34000",
        },
        shipping_address: {
          first_name: "Test",
          last_name: "Kullanıcı",
          address_1: "Test Sokak",
          city: "Istanbul",
          country_code: "TR",
          postal_code: "34000",
        },
        // headers yok
      } as any,
    })

    console.log(`\n[PRESERVATION] İyzico — Header yok`)
    console.log(`  Gönderilen buyer.ip: "${capturedBuyerIp}"`)
    console.log(`  Beklenen: "127.0.0.1" (fallback — mevcut davranış korunuyor)\n`)

    // Mevcut davranış: header yokken 127.0.0.1 kullanılır
    expect(capturedBuyerIp).toBe("127.0.0.1")
  })

  it("ödeme akışı başarıyla tamamlanır ve geçerli bir id döner", async () => {
    const result = await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {
        customer: { email: "test@test.com" },
        billing_address: {},
        shipping_address: {},
      } as any,
    })

    expect(result.id).toBeDefined()
    expect(result.id).toMatch(/^iyzi_/)
    expect(result.data?.status).toBe("pending")
  })
})
