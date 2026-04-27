/**
 * Hata Koşulu Keşif Testi — Webhook İmza Doğrulaması (PayTR & İyzico)
 *
 * AMAÇ: Düzeltme uygulanmadan önce mevcut kodda `getWebhookActionAndData`
 * metodunun imzasız payload için `action: "authorized"` döndürdüğünü
 * gösteren counterexample'lar üretmek.
 *
 * BU TEST BAŞARISIZ OLMALIDIR — bu beklenen ve doğru sonuçtur.
 * Başarısızlık, hatanın varlığını kanıtlar.
 *
 * Hedef:
 *   src/providers/paytr/provider.ts  — getWebhookActionAndData
 *   src/providers/iyzico/provider.ts — getWebhookActionAndData
 *
 * Hata Koşulu (Requirements 1.1, 1.2, 1.3):
 *   Her iki provider da imza doğrulaması yapmadan `action: "authorized"` döndürüyor.
 *   Geçerli bir merchant_oid bilen herhangi bir saldırgan sahte webhook göndererek
 *   siparişleri "ödendi" olarak işaretleyebilir.
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 */

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

describe("PayTR Provider — Webhook İmza Doğrulaması Keşif Testi", () => {
  let provider: PayTRProvider

  beforeEach(() => {
    provider = new PayTRProvider(createMockContainer(), {
      merchant_id: "TEST_MERCHANT",
      merchant_key: "TEST_KEY_32CHARS_PADDED_XXXXXXXXX",
      merchant_salt: "TEST_SALT_16CHARS",
      debug: true,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Counterexample 1: Boş hash ile PayTR webhook
   *
   * Beklenen (düzeltilmiş): action: "not_supported" (imza geçersiz)
   * Gerçek (hatalı kod):    action: "authorized"    (imza kontrolü yok)
   *
   * Hata Koşulu (Requirements 1.1):
   *   hash: "" → imzasız payload → sistem yine de "authorized" döndürüyor
   */
  it("boş hash ile PayTR webhook geldiğinde action NOT_SUPPORTED olmalı (şu an AUTHORIZED dönüyor — HATA)", async () => {
    const result = await provider.getWebhookActionAndData({
      data: {
        merchant_oid: "paytr_test_001",
        status: "success",
        hash: "",
        total_amount: "10000",
      },
    } as any)

    console.log(`\n[COUNTEREXAMPLE 1] PayTR — boş hash`)
    console.log(`  Payload: { merchant_oid: "paytr_test_001", status: "success", hash: "" }`)
    console.log(`  Dönen action: "${result.action}"`)
    console.log(`  Beklenen (düzeltilmiş): "not_supported"`)
    console.log(`  Hata: İmza doğrulaması yok — imzasız payload "authorized" döndürüyor\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar (Requirements 1.1)
    // Düzeltilmemiş kod: action: "authorized" döner
    // Düzeltilmiş kod:   action: "not_supported" döner
    expect(result.action).not.toBe("authorized")
    expect(result.action).toBe("not_supported")
  })

  /**
   * Counterexample 2: Sahte/geçersiz hash ile PayTR webhook
   *
   * Beklenen (düzeltilmiş): action: "not_supported"
   * Gerçek (hatalı kod):    action: "authorized"
   *
   * Hata Koşulu (Requirements 1.1):
   *   hash: "SAHTE_HASH" → geçersiz imza → sistem yine de "authorized" döndürüyor
   */
  it("sahte hash ile PayTR webhook geldiğinde action NOT_SUPPORTED olmalı (şu an AUTHORIZED dönüyor — HATA)", async () => {
    const result = await provider.getWebhookActionAndData({
      data: {
        merchant_oid: "paytr_test_001",
        status: "success",
        hash: "SAHTE_HASH_GECERSIZ_IMZA",
        total_amount: "10000",
      },
    } as any)

    console.log(`\n[COUNTEREXAMPLE 2] PayTR — sahte hash`)
    console.log(`  Payload: { merchant_oid: "paytr_test_001", status: "success", hash: "SAHTE_HASH_GECERSIZ_IMZA" }`)
    console.log(`  Dönen action: "${result.action}"`)
    console.log(`  Beklenen (düzeltilmiş): "not_supported"`)
    console.log(`  Hata: Sahte hash kabul ediliyor — imza doğrulaması yok\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar (Requirements 1.1)
    expect(result.action).not.toBe("authorized")
    expect(result.action).toBe("not_supported")
  })

  /**
   * Counterexample 3: null hash ile PayTR webhook
   *
   * Hata Koşulu (Requirements 1.1):
   *   hash: null → imza alanı yok → sistem yine de "authorized" döndürüyor
   */
  it("null hash ile PayTR webhook geldiğinde action NOT_SUPPORTED olmalı (şu an AUTHORIZED dönüyor — HATA)", async () => {
    const result = await provider.getWebhookActionAndData({
      data: {
        merchant_oid: "paytr_test_002",
        status: "success",
        hash: null,
        total_amount: "5000",
      },
    } as any)

    console.log(`\n[COUNTEREXAMPLE 3] PayTR — null hash`)
    console.log(`  Payload: { merchant_oid: "paytr_test_002", status: "success", hash: null }`)
    console.log(`  Dönen action: "${result.action}"`)
    console.log(`  Beklenen (düzeltilmiş): "not_supported"`)
    console.log(`  Hata: null hash kabul ediliyor — imza doğrulaması yok\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar
    expect(result.action).not.toBe("authorized")
    expect(result.action).toBe("not_supported")
  })

  /**
   * Property Test: ∀ invalidHash → action MUST NOT be "authorized"
   *
   * Rastgele geçersiz hash string'leri için property-based test.
   * Düzeltilmemiş kodda TÜM bu hash'ler "authorized" döndürür — HATA KANITI.
   *
   * Validates: Requirements 1.1, 1.2, 1.3
   */
  it("rastgele geçersiz hash string'leri için action ASLA authorized olmamalı (şu an OLUYOR — HATA)", async () => {
    const invalidHashes = [
      "",
      "INVALID",
      "0000000000000000000000000000000000000000000=",
      "aGFja2VkX2hhc2g=",
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=",
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      "random_string_not_base64",
      "dGVzdA==",
      "c2FoZXRlX2ltemE=",
    ]

    const results: Array<{ hash: string; action: string }> = []

    for (const invalidHash of invalidHashes) {
      const result = await provider.getWebhookActionAndData({
        data: {
          merchant_oid: "paytr_property_test",
          status: "success",
          hash: invalidHash,
          total_amount: "10000",
        },
      } as any)
      results.push({ hash: invalidHash, action: result.action })
    }

    console.log(`\n[PROPERTY TEST] PayTR — ∀ invalidHash → action MUST NOT be "authorized"`)
    console.log(`  Test edilen ${results.length} geçersiz hash:`)
    results.forEach(({ hash, action }) => {
      const status = action === "authorized" ? "❌ HATA" : "✓ DOĞRU"
      console.log(`    hash: "${hash.substring(0, 20)}..." → action: "${action}" ${status}`)
    })

    const authorizedCount = results.filter(r => r.action === "authorized").length
    console.log(`\n  Toplam "authorized" dönen: ${authorizedCount}/${results.length}`)
    console.log(`  Beklenen: 0 (hiçbiri authorized olmamalı)`)
    console.log(`  Hata: İmza doğrulaması yok — tüm geçersiz hash'ler "authorized" döndürüyor\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar (Requirements 1.1, 1.2, 1.3)
    // Düzeltilmemiş kodda TÜM geçersiz hash'ler "authorized" döner
    const anyAuthorized = results.some(r => r.action === "authorized")
    expect(anyAuthorized).toBe(false)
  })
})

// ─── İyzico Keşif Testleri ────────────────────────────────────────────────────

describe("İyzico Provider — Webhook İmza Doğrulaması Keşif Testi", () => {
  let provider: IyzicoProvider

  beforeEach(() => {
    provider = new IyzicoProvider(createMockContainer(), {
      api_key: "TEST_API_KEY",
      secret_key: "TEST_SECRET_KEY_32CHARS_PADDED_XX",
      base_url: "https://sandbox-api.iyzipay.com",
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Counterexample 4: İmza alanı olmayan İyzico webhook
   *
   * Beklenen (düzeltilmiş): action: "not_supported"
   * Gerçek (hatalı kod):    action: "authorized"
   *
   * Hata Koşulu (Requirements 1.2):
   *   İmza alanı yok → sistem yine de "authorized" döndürüyor
   */
  it("imza alanı olmayan İyzico webhook geldiğinde action NOT_SUPPORTED olmalı (şu an AUTHORIZED dönüyor — HATA)", async () => {
    const result = await provider.getWebhookActionAndData({
      data: {
        paymentId: "iyzi_test_001",
        status: "SUCCESS",
        // iyziReferenceCode veya signature alanı YOK
      },
    } as any)

    console.log(`\n[COUNTEREXAMPLE 4] İyzico — imza alanı yok`)
    console.log(`  Payload: { paymentId: "iyzi_test_001", status: "SUCCESS" } (imza yok)`)
    console.log(`  Dönen action: "${result.action}"`)
    console.log(`  Beklenen (düzeltilmiş): "not_supported"`)
    console.log(`  Hata: İmza alanı olmayan payload "authorized" döndürüyor\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar (Requirements 1.2)
    expect(result.action).not.toBe("authorized")
    expect(result.action).toBe("not_supported")
  })

  /**
   * Counterexample 5: Sahte iyziReferenceCode ile İyzico webhook
   *
   * Beklenen (düzeltilmiş): action: "not_supported"
   * Gerçek (hatalı kod):    action: "authorized"
   *
   * Hata Koşulu (Requirements 1.2):
   *   Sahte referans kodu → geçersiz imza → sistem yine de "authorized" döndürüyor
   */
  it("sahte iyziReferenceCode ile İyzico webhook geldiğinde action NOT_SUPPORTED olmalı (şu an AUTHORIZED dönüyor — HATA)", async () => {
    const result = await provider.getWebhookActionAndData({
      data: {
        paymentId: "iyzi_test_001",
        status: "SUCCESS",
        iyziReferenceCode: "SAHTE_REFERANS_KODU_GECERSIZ",
      },
    } as any)

    console.log(`\n[COUNTEREXAMPLE 5] İyzico — sahte iyziReferenceCode`)
    console.log(`  Payload: { paymentId: "iyzi_test_001", status: "SUCCESS", iyziReferenceCode: "SAHTE_REFERANS_KODU_GECERSIZ" }`)
    console.log(`  Dönen action: "${result.action}"`)
    console.log(`  Beklenen (düzeltilmiş): "not_supported"`)
    console.log(`  Hata: Sahte referans kodu kabul ediliyor — imza doğrulaması yok\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar (Requirements 1.2)
    expect(result.action).not.toBe("authorized")
    expect(result.action).toBe("not_supported")
  })

  /**
   * Counterexample 6: Boş signature ile İyzico webhook
   *
   * Hata Koşulu (Requirements 1.2):
   *   signature: "" → boş imza → sistem yine de "authorized" döndürüyor
   */
  it("boş signature ile İyzico webhook geldiğinde action NOT_SUPPORTED olmalı (şu an AUTHORIZED dönüyor — HATA)", async () => {
    const result = await provider.getWebhookActionAndData({
      data: {
        paymentId: "iyzi_test_002",
        status: "SUCCESS",
        iyziReferenceCode: "",
      },
    } as any)

    console.log(`\n[COUNTEREXAMPLE 6] İyzico — boş signature`)
    console.log(`  Payload: { paymentId: "iyzi_test_002", status: "SUCCESS", iyziReferenceCode: "" }`)
    console.log(`  Dönen action: "${result.action}"`)
    console.log(`  Beklenen (düzeltilmiş): "not_supported"`)
    console.log(`  Hata: Boş imza kabul ediliyor — imza doğrulaması yok\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar
    expect(result.action).not.toBe("authorized")
    expect(result.action).toBe("not_supported")
  })

  /**
   * Property Test: ∀ invalidSignature → action MUST NOT be "authorized"
   *
   * Rastgele geçersiz imza string'leri için property-based test.
   * Düzeltilmemiş kodda TÜM bu imzalar "authorized" döndürür — HATA KANITI.
   *
   * Validates: Requirements 1.1, 1.2, 1.3
   */
  it("rastgele geçersiz imza string'leri için action ASLA authorized olmamalı (şu an OLUYOR — HATA)", async () => {
    const invalidSignatures = [
      "",
      "INVALID_SIG",
      "0000000000000000000000000000000000000000000=",
      "aGFja2VkX3NpZ25hdHVyZQ==",
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=",
      "random_not_valid_sha1",
      "dGVzdA==",
      "c2FoZXRlX2ltemE=",
    ]

    const results: Array<{ sig: string; action: string }> = []

    for (const invalidSig of invalidSignatures) {
      const result = await provider.getWebhookActionAndData({
        data: {
          paymentId: "iyzi_property_test",
          status: "SUCCESS",
          iyziReferenceCode: invalidSig,
        },
      } as any)
      results.push({ sig: invalidSig, action: result.action })
    }

    console.log(`\n[PROPERTY TEST] İyzico — ∀ invalidSignature → action MUST NOT be "authorized"`)
    console.log(`  Test edilen ${results.length} geçersiz imza:`)
    results.forEach(({ sig, action }) => {
      const status = action === "authorized" ? "❌ HATA" : "✓ DOĞRU"
      console.log(`    sig: "${sig.substring(0, 20)}..." → action: "${action}" ${status}`)
    })

    const authorizedCount = results.filter(r => r.action === "authorized").length
    console.log(`\n  Toplam "authorized" dönen: ${authorizedCount}/${results.length}`)
    console.log(`  Beklenen: 0 (hiçbiri authorized olmamalı)`)
    console.log(`  Hata: İmza doğrulaması yok — tüm geçersiz imzalar "authorized" döndürüyor\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar (Requirements 1.1, 1.2, 1.3)
    const anyAuthorized = results.some(r => r.action === "authorized")
    expect(anyAuthorized).toBe(false)
  })
})
