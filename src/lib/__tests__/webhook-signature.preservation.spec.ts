/**
 * Koruma Testi — Webhook İmza Doğrulaması (PayTR & İyzico)
 *
 * AMAÇ: Gözlem-önce metodolojisi — düzeltilmemiş kodda geçerli imzalı
 * payload'ların `action: "authorized"` döndürdüğünü gözlemle ve belgele.
 *
 * Bu davranış düzeltme sonrasında da KORUNMALIDIR.
 *
 * Property 2: Preservation — Geçerli İmzalı Webhook İşleme
 *   ∀ validSignedPayload → action = "authorized"
 *
 * Düzeltilmemiş kodda çalıştır — BEKLENEN SONUÇ: BAŞARILI
 * (baseline davranışı doğrular; düzeltme sonrasında da geçerli olmalı)
 *
 * Hedef:
 *   src/providers/paytr/provider.ts  — getWebhookActionAndData
 *   src/providers/iyzico/provider.ts — getWebhookActionAndData
 *
 * Validates: Requirements 3.1, 3.2
 */

import crypto from "crypto"

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

// ─── Test sabitleri ───────────────────────────────────────────────────────────

const PAYTR_MERCHANT_KEY  = "TEST_KEY_32CHARS_PADDED_XXXXXXXXX"
const PAYTR_MERCHANT_SALT = "TEST_SALT_16CHARS"

const IYZICO_SECRET_KEY = "TEST_SECRET_KEY_32CHARS_PADDED_XX"

// ─── Yardımcı: Geçerli PayTR hash hesapla ────────────────────────────────────
// PayTR webhook hash formülü:
//   hash_str = merchant_key + merchant_salt + merchant_oid + status
//   hash     = HMAC-SHA256(hash_str, merchant_salt) → base64

function computePayTRHash(
  merchantKey: string,
  merchantSalt: string,
  merchantOid: string,
  status: string
): string {
  const hashStr = merchantKey + merchantSalt + merchantOid + status
  return crypto
    .createHmac("sha256", merchantSalt)
    .update(hashStr)
    .digest("base64")
}

// ─── Yardımcı: Geçerli İyzico imza hesapla ───────────────────────────────────
// İyzico webhook imza formülü:
//   SHA1(secret_key + paymentId + paymentStatus) → base64

function computeIyzicoSignature(
  secretKey: string,
  paymentId: string,
  paymentStatus: string
): string {
  return crypto
    .createHash("sha1")
    .update(secretKey + paymentId + paymentStatus)
    .digest("base64")
}

// ─── Mock container ───────────────────────────────────────────────────────────

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

// ─── PayTR Koruma Testleri ────────────────────────────────────────────────────

describe("PayTR Provider — Geçerli İmzalı Webhook Koruma Testi", () => {
  let provider: PayTRProvider

  beforeEach(() => {
    provider = new PayTRProvider(createMockContainer(), {
      merchant_id: "TEST_MERCHANT",
      merchant_key: PAYTR_MERCHANT_KEY,
      merchant_salt: PAYTR_MERCHANT_SALT,
      debug: true,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Gözlem 1: Doğru HMAC-SHA256 ile imzalanmış PayTR payload → action: "authorized"
   *
   * Düzeltilmemiş kodda: imza kontrolü yok → her zaman "authorized" döner
   * Düzeltilmiş kodda:   geçerli imza → "authorized" döner (KORUNMALI)
   *
   * Validates: Requirements 3.1
   */
  it("doğru HMAC-SHA256 ile imzalanmış PayTR payload action: authorized döndürmeli", async () => {
    const merchantOid = "paytr_preservation_001"
    const status = "success"
    const validHash = computePayTRHash(
      PAYTR_MERCHANT_KEY,
      PAYTR_MERCHANT_SALT,
      merchantOid,
      status
    )

    const result = await provider.getWebhookActionAndData({
      data: {
        merchant_oid: merchantOid,
        status,
        hash: validHash,
        total_amount: "10000",
      },
    } as any)

    console.log(`\n[PRESERVATION 1] PayTR — geçerli HMAC-SHA256 imzalı payload`)
    console.log(`  merchant_oid: "${merchantOid}"`)
    console.log(`  status: "${status}"`)
    console.log(`  hash (hesaplanan): "${validHash}"`)
    console.log(`  Dönen action: "${result.action}"`)
    console.log(`  Beklenen: "authorized" (korunmalı)\n`)

    // Bu test BAŞARILI olmalı — geçerli imzalı payload "authorized" döndürüyor
    expect(result.action).toBe("authorized")
  })

  /**
   * Gözlem 2: Farklı merchant_oid ile geçerli imzalı PayTR payload → action: "authorized"
   *
   * Validates: Requirements 3.1
   */
  it("farklı merchant_oid ile geçerli imzalı PayTR payload action: authorized döndürmeli", async () => {
    const merchantOid = "paytr_preservation_002"
    const status = "success"
    const validHash = computePayTRHash(
      PAYTR_MERCHANT_KEY,
      PAYTR_MERCHANT_SALT,
      merchantOid,
      status
    )

    const result = await provider.getWebhookActionAndData({
      data: {
        merchant_oid: merchantOid,
        status,
        hash: validHash,
        total_amount: "25000",
      },
    } as any)

    console.log(`\n[PRESERVATION 2] PayTR — farklı merchant_oid ile geçerli imza`)
    console.log(`  merchant_oid: "${merchantOid}"`)
    console.log(`  hash (hesaplanan): "${validHash}"`)
    console.log(`  Dönen action: "${result.action}"`)
    console.log(`  Beklenen: "authorized" (korunmalı)\n`)

    expect(result.action).toBe("authorized")
  })

  /**
   * Property Test: ∀ validSignedPayload → action = "authorized"
   *
   * Birden fazla geçerli imzalı PayTR payload için property testi.
   * Düzeltilmemiş ve düzeltilmiş kodda bu davranış korunmalıdır.
   *
   * Validates: Requirements 3.1
   */
  it("tüm geçerli imzalı PayTR payload'ları action: authorized döndürmeli", async () => {
    const testCases = [
      { merchantOid: "paytr_prop_001", status: "success", amount: "10000" },
      { merchantOid: "paytr_prop_002", status: "success", amount: "50000" },
      { merchantOid: "paytr_prop_003", status: "success", amount: "1000" },
      { merchantOid: "paytr_prop_004", status: "success", amount: "99999" },
      { merchantOid: "paytr_prop_005", status: "success", amount: "500" },
    ]

    const results: Array<{ merchantOid: string; action: string }> = []

    for (const tc of testCases) {
      const validHash = computePayTRHash(
        PAYTR_MERCHANT_KEY,
        PAYTR_MERCHANT_SALT,
        tc.merchantOid,
        tc.status
      )

      const result = await provider.getWebhookActionAndData({
        data: {
          merchant_oid: tc.merchantOid,
          status: tc.status,
          hash: validHash,
          total_amount: tc.amount,
        },
      } as any)

      results.push({ merchantOid: tc.merchantOid, action: result.action })
    }

    console.log(`\n[PROPERTY TEST] PayTR — ∀ validSignedPayload → action = "authorized"`)
    console.log(`  Test edilen ${results.length} geçerli imzalı payload:`)
    results.forEach(({ merchantOid, action }) => {
      const status = action === "authorized" ? "✓ DOĞRU" : "❌ HATA"
      console.log(`    merchant_oid: "${merchantOid}" → action: "${action}" ${status}`)
    })

    const allAuthorized = results.every(r => r.action === "authorized")
    console.log(`\n  Tümü "authorized": ${allAuthorized ? "✓ EVET" : "❌ HAYIR"}`)
    console.log(`  Beklenen: tümü "authorized" (korunmalı)\n`)

    // Tüm geçerli imzalı payload'lar "authorized" döndürmeli
    expect(allAuthorized).toBe(true)
  })
})

// ─── İyzico Koruma Testleri ───────────────────────────────────────────────────

describe("İyzico Provider — Geçerli İmzalı Webhook Koruma Testi", () => {
  let provider: IyzicoProvider

  beforeEach(() => {
    provider = new IyzicoProvider(createMockContainer(), {
      api_key: "TEST_API_KEY",
      secret_key: IYZICO_SECRET_KEY,
      base_url: "https://sandbox-api.iyzipay.com",
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Gözlem 3: Doğru imzalı İyzico payload → action: "authorized"
   *
   * İyzico imza formülü: SHA1(secret_key + paymentId + paymentStatus) → base64
   *
   * Düzeltilmemiş kodda: imza kontrolü yok → her zaman "authorized" döner
   * Düzeltilmiş kodda:   geçerli imza → "authorized" döner (KORUNMALI)
   *
   * Validates: Requirements 3.2
   */
  it("doğru SHA1 imzalı İyzico payload action: authorized döndürmeli", async () => {
    const paymentId = "iyzi_preservation_001"
    const paymentStatus = "SUCCESS"
    const validSignature = computeIyzicoSignature(
      IYZICO_SECRET_KEY,
      paymentId,
      paymentStatus
    )

    const result = await provider.getWebhookActionAndData({
      data: {
        paymentId,
        paymentStatus,
        status: paymentStatus,
        iyziReferenceCode: validSignature,
      },
    } as any)

    console.log(`\n[PRESERVATION 3] İyzico — geçerli SHA1 imzalı payload`)
    console.log(`  paymentId: "${paymentId}"`)
    console.log(`  paymentStatus: "${paymentStatus}"`)
    console.log(`  iyziReferenceCode (hesaplanan): "${validSignature}"`)
    console.log(`  Dönen action: "${result.action}"`)
    console.log(`  Beklenen: "authorized" (korunmalı)\n`)

    // Bu test BAŞARILI olmalı — geçerli imzalı payload "authorized" döndürüyor
    expect(result.action).toBe("authorized")
  })

  /**
   * Gözlem 4: Farklı paymentId ile geçerli imzalı İyzico payload → action: "authorized"
   *
   * Validates: Requirements 3.2
   */
  it("farklı paymentId ile geçerli imzalı İyzico payload action: authorized döndürmeli", async () => {
    const paymentId = "iyzi_preservation_002"
    const paymentStatus = "SUCCESS"
    const validSignature = computeIyzicoSignature(
      IYZICO_SECRET_KEY,
      paymentId,
      paymentStatus
    )

    const result = await provider.getWebhookActionAndData({
      data: {
        paymentId,
        paymentStatus,
        status: paymentStatus,
        iyziReferenceCode: validSignature,
      },
    } as any)

    console.log(`\n[PRESERVATION 4] İyzico — farklı paymentId ile geçerli imza`)
    console.log(`  paymentId: "${paymentId}"`)
    console.log(`  iyziReferenceCode (hesaplanan): "${validSignature}"`)
    console.log(`  Dönen action: "${result.action}"`)
    console.log(`  Beklenen: "authorized" (korunmalı)\n`)

    expect(result.action).toBe("authorized")
  })

  /**
   * Property Test: ∀ validSignedIyzicoPayload → action = "authorized"
   *
   * Birden fazla geçerli imzalı İyzico payload için property testi.
   *
   * Validates: Requirements 3.2
   */
  it("tüm geçerli imzalı İyzico payload'ları action: authorized döndürmeli", async () => {
    const testCases = [
      { paymentId: "iyzi_prop_001", paymentStatus: "SUCCESS" },
      { paymentId: "iyzi_prop_002", paymentStatus: "SUCCESS" },
      { paymentId: "iyzi_prop_003", paymentStatus: "SUCCESS" },
      { paymentId: "iyzi_prop_004", paymentStatus: "SUCCESS" },
      { paymentId: "iyzi_prop_005", paymentStatus: "SUCCESS" },
    ]

    const results: Array<{ paymentId: string; action: string }> = []

    for (const tc of testCases) {
      const validSignature = computeIyzicoSignature(
        IYZICO_SECRET_KEY,
        tc.paymentId,
        tc.paymentStatus
      )

      const result = await provider.getWebhookActionAndData({
        data: {
          paymentId: tc.paymentId,
          paymentStatus: tc.paymentStatus,
          status: tc.paymentStatus,
          iyziReferenceCode: validSignature,
        },
      } as any)

      results.push({ paymentId: tc.paymentId, action: result.action })
    }

    console.log(`\n[PROPERTY TEST] İyzico — ∀ validSignedPayload → action = "authorized"`)
    console.log(`  Test edilen ${results.length} geçerli imzalı payload:`)
    results.forEach(({ paymentId, action }) => {
      const status = action === "authorized" ? "✓ DOĞRU" : "❌ HATA"
      console.log(`    paymentId: "${paymentId}" → action: "${action}" ${status}`)
    })

    const allAuthorized = results.every(r => r.action === "authorized")
    console.log(`\n  Tümü "authorized": ${allAuthorized ? "✓ EVET" : "❌ HAYIR"}`)
    console.log(`  Beklenen: tümü "authorized" (korunmalı)\n`)

    // Tüm geçerli imzalı payload'lar "authorized" döndürmeli
    expect(allAuthorized).toBe(true)
  })
})
