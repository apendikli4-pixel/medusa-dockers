/**
 * Hata Koşulu Keşif Testi — Hardcoded IP (PayTR & İyzico)
 *
 * AMAÇ: Düzeltme uygulanmadan önce mevcut kodda `user_ip = "127.0.0.1"` hatasını
 * gösteren counterexample'lar üretmek.
 *
 * BU TEST BAŞARISIZ OLMALIDIR — bu beklenen ve doğru sonuçtur.
 * Başarısızlık, hatanın varlığını kanıtlar.
 *
 * Validates: Requirements 1.1, 1.2, 1.3
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

// ─── PayTR Keşif Testleri ─────────────────────────────────────────────────────

describe("PayTR Provider — Hardcoded IP Keşif Testi", () => {
  let provider: PayTRProvider
  let capturedFormData: URLSearchParams | null = null

  beforeEach(() => {
    capturedFormData = null

    // PayTR API çağrısını intercept et — gönderilen formData'yı yakala
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
      debug: true,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Counterexample 1: x-forwarded-for header'ı ile istek
   *
   * Beklenen (düzeltilmiş): user_ip = "88.249.10.5"
   * Gerçek (hatalı kod):    user_ip = "127.0.0.1"
   */
  it("x-forwarded-for: 88.249.10.5 header'ı ile istek yapıldığında user_ip hâlâ 127.0.0.1 olmamalı", async () => {
    await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {
        headers: {
          "x-forwarded-for": "88.249.10.5",
        },
        customer: { email: "test@test.com" },
      } as any,
    })

    // Hata koşulunu kanıtla: user_ip hâlâ "127.0.0.1"
    const sentUserIp = capturedFormData?.get("user_ip")

    console.log(`\n[COUNTEREXAMPLE 1] x-forwarded-for: "88.249.10.5"`)
    console.log(`  Gönderilen user_ip: "${sentUserIp}"`)
    console.log(`  Beklenen: "88.249.10.5" (gerçek IP)`)
    console.log(`  Hata: user_ip = "127.0.0.1" hardcoded\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar
    expect(sentUserIp).not.toBe("127.0.0.1")
    expect(sentUserIp).toBe("88.249.10.5")
  })

  /**
   * Counterexample 2: x-real-ip header'ı ile istek
   *
   * Beklenen (düzeltilmiş): user_ip = "88.249.10.5"
   * Gerçek (hatalı kod):    user_ip = "127.0.0.1"
   */
  it("x-real-ip: 88.249.10.5 header'ı ile istek yapıldığında user_ip hâlâ 127.0.0.1 olmamalı", async () => {
    await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {
        headers: {
          "x-real-ip": "88.249.10.5",
        },
        customer: { email: "test@test.com" },
      } as any,
    })

    const sentUserIp = capturedFormData?.get("user_ip")

    console.log(`\n[COUNTEREXAMPLE 2] x-real-ip: "88.249.10.5"`)
    console.log(`  Gönderilen user_ip: "${sentUserIp}"`)
    console.log(`  Beklenen: "88.249.10.5" (gerçek IP)`)
    console.log(`  Hata: user_ip = "127.0.0.1" hardcoded\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar
    expect(sentUserIp).not.toBe("127.0.0.1")
    expect(sentUserIp).toBe("88.249.10.5")
  })

  /**
   * Counterexample 3: Proxy zinciri ile istek
   *
   * Beklenen (düzeltilmiş): user_ip = "88.249.10.5" (ilk IP)
   * Gerçek (hatalı kod):    user_ip = "127.0.0.1"
   */
  it("proxy zinciri 88.249.10.5, 10.0.0.1 ile istek yapıldığında user_ip ilk IP olmalı", async () => {
    await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {
        headers: {
          "x-forwarded-for": "88.249.10.5, 10.0.0.1",
        },
        customer: { email: "test@test.com" },
      } as any,
    })

    const sentUserIp = capturedFormData?.get("user_ip")

    console.log(`\n[COUNTEREXAMPLE 3] x-forwarded-for: "88.249.10.5, 10.0.0.1" (proxy zinciri)`)
    console.log(`  Gönderilen user_ip: "${sentUserIp}"`)
    console.log(`  Beklenen: "88.249.10.5" (proxy zincirinin ilk IP'si)`)
    console.log(`  Hata: user_ip = "127.0.0.1" hardcoded\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar
    expect(sentUserIp).not.toBe("127.0.0.1")
    expect(sentUserIp).toBe("88.249.10.5")
  })
})

// ─── İyzico Keşif Testleri ────────────────────────────────────────────────────

describe("İyzico Provider — Hardcoded IP Keşif Testi", () => {
  let provider: IyzicoProvider
  let capturedBuyerIp: string | null = null

  beforeEach(() => {
    capturedBuyerIp = null

    // iyzipay mock'unu buyer.ip'yi yakalayacak şekilde güncelle
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

  /**
   * Counterexample 4: İyzico buyer.ip hardcoded
   *
   * Beklenen (düzeltilmiş): buyer.ip = "88.249.10.5"
   * Gerçek (hatalı kod):    buyer.ip = "127.0.0.1"
   */
  it("x-forwarded-for: 88.249.10.5 header'ı ile istek yapıldığında buyer.ip hâlâ 127.0.0.1 olmamalı", async () => {
    await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {
        headers: {
          "x-forwarded-for": "88.249.10.5",
        },
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
      } as any,
    })

    console.log(`\n[COUNTEREXAMPLE 4] İyzico — x-forwarded-for: "88.249.10.5"`)
    console.log(`  Gönderilen buyer.ip: "${capturedBuyerIp}"`)
    console.log(`  Beklenen: "88.249.10.5" (gerçek IP)`)
    console.log(`  Hata: ip: "127.0.0.1" hardcoded (src/providers/iyzico/provider.ts ~satır 100)\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar
    expect(capturedBuyerIp).not.toBe("127.0.0.1")
    expect(capturedBuyerIp).toBe("88.249.10.5")
  })

  /**
   * Counterexample 5: İyzico x-real-ip header'ı
   */
  it("x-real-ip: 88.249.10.5 header'ı ile istek yapıldığında buyer.ip hâlâ 127.0.0.1 olmamalı", async () => {
    await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {
        headers: {
          "x-real-ip": "88.249.10.5",
        },
        customer: { email: "test@test.com" },
        billing_address: {},
        shipping_address: {},
      } as any,
    })

    console.log(`\n[COUNTEREXAMPLE 5] İyzico — x-real-ip: "88.249.10.5"`)
    console.log(`  Gönderilen buyer.ip: "${capturedBuyerIp}"`)
    console.log(`  Beklenen: "88.249.10.5" (gerçek IP)`)
    console.log(`  Hata: ip: "127.0.0.1" hardcoded\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar
    expect(capturedBuyerIp).not.toBe("127.0.0.1")
    expect(capturedBuyerIp).toBe("88.249.10.5")
  })

  /**
   * Counterexample 6: İyzico proxy zinciri
   */
  it("proxy zinciri 88.249.10.5, 10.0.0.1 ile istek yapıldığında buyer.ip ilk IP olmalı", async () => {
    await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {
        headers: {
          "x-forwarded-for": "88.249.10.5, 10.0.0.1",
        },
        customer: { email: "test@test.com" },
        billing_address: {},
        shipping_address: {},
      } as any,
    })

    console.log(`\n[COUNTEREXAMPLE 6] İyzico — x-forwarded-for: "88.249.10.5, 10.0.0.1" (proxy zinciri)`)
    console.log(`  Gönderilen buyer.ip: "${capturedBuyerIp}"`)
    console.log(`  Beklenen: "88.249.10.5" (proxy zincirinin ilk IP'si)`)
    console.log(`  Hata: ip: "127.0.0.1" hardcoded\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar
    expect(capturedBuyerIp).not.toBe("127.0.0.1")
    expect(capturedBuyerIp).toBe("88.249.10.5")
  })
})
