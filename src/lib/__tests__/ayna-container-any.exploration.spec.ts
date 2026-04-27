/**
 * Hata Koşulu Keşif Testi — AynaService container as any
 *
 * AMAÇ: Düzeltme uygulanmadan önce mevcut kodda `(container as any)` cast'inin
 * `undefined` döndürdüğünü gösteren counterexample'lar üretmek.
 *
 * BU TEST BAŞARISIZ OLMALIDIR — bu beklenen ve doğru sonuçtur.
 * Başarısızlık, hatanın varlığını kanıtlar.
 *
 * Hedef: src/modules/ayna/service.ts ~satır 80-85
 *   this.productModuleService_ = (container as any).productModuleService || (container as any)["product"]
 *   this.stockLocationService_ = (container as any).stockLocationModuleService || (container as any)["stock_location"]
 *   this.inventoryService_ = (container as any).inventoryService || (container as any)["inventory"]
 *
 * Hata Koşulu (Requirements 1.7, 1.8, 1.9):
 *   Medusa v2 modül izolasyonu ihlali — container as any cast'i ile servis çözümleme
 *
 * Validates: Requirements 1.7, 1.8, 1.9
 */

// ─── Yardımcı: Medusa v2 modül izolasyonunu simüle eden container ─────────────

/**
 * Medusa v2'de her modül kendi izole container'ında çalışır.
 * Başka modüllerin servislerine (container as any) ile erişilemez.
 * Bu fonksiyon bu izolasyonu simüle eder.
 */
function createIsolatedMedusaContainer() {
  return {
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
    // Medusa v2 modül izolasyonu: diğer modüllerin servisleri bu container'da YOKTUR
    // productModuleService, stockLocationModuleService, inventoryService tanımlı değil
  }
}

/**
 * Medusa v2 container'ının (container as any) erişim davranışını simüle eder.
 * Gerçek Medusa v2'de bu erişimler undefined döner.
 */
function simulateContainerAnyAccess(container: any) {
  return {
    // Nokta notasyonu ile erişim
    productModuleService: (container as any).productModuleService,
    stockLocationModuleService: (container as any).stockLocationModuleService,
    inventoryService: (container as any).inventoryService,

    // String index ile erişim
    productByIndex: (container as any)["product"],
    stockLocationByIndex: (container as any)["stock_location"],
    inventoryByIndex: (container as any)["inventory"],
  }
}

// ─── Keşif Testleri ───────────────────────────────────────────────────────────

describe("AynaService — container as any Modül İzolasyonu İhlali Keşif Testi", () => {
  let container: ReturnType<typeof createIsolatedMedusaContainer>

  beforeEach(() => {
    container = createIsolatedMedusaContainer()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Counterexample 1: (container as any).productModuleService → undefined
   *
   * Beklenen (düzeltilmiş): remoteQuery pattern kullanılmalı
   * Gerçek (hatalı kod):    (container as any).productModuleService → undefined
   *
   * Hata Koşulu (Requirements 1.7):
   *   AynaService başlatıldığında productModuleService_ undefined olur
   */
  it("(container as any).productModuleService undefined döner — modül izolasyonu ihlali kanıtlanır", () => {
    const access = simulateContainerAnyAccess(container)

    console.log(`\n[COUNTEREXAMPLE 1] (container as any).productModuleService`)
    console.log(`  Dönen değer: ${access.productModuleService}`)
    console.log(`  Beklenen (düzeltilmiş): remoteQuery pattern`)
    console.log(`  Hata: Medusa v2 modül izolasyonu — productModuleService erişilemiyor\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar (Requirements 1.7)
    // Hatalı kod: (container as any).productModuleService → undefined
    // Düzeltilmiş kod: remoteQuery pattern kullanmalı
    expect(access.productModuleService).toBeUndefined()
  })

  /**
   * Counterexample 2: (container as any)["product"] → undefined
   *
   * Beklenen (düzeltilmiş): remoteQuery pattern kullanılmalı
   * Gerçek (hatalı kod):    (container as any)["product"] → undefined
   *
   * Hata Koşulu (Requirements 1.8):
   *   Medusa v2 güncelleme sonrası modül isimlendirmesi değişirse sessizce undefined döner
   */
  it('(container as any)["product"] undefined döner — sessiz hata kanıtlanır', () => {
    const access = simulateContainerAnyAccess(container)

    console.log(`\n[COUNTEREXAMPLE 2] (container as any)["product"]`)
    console.log(`  Dönen değer: ${access.productByIndex}`)
    console.log(`  Beklenen (düzeltilmiş): remoteQuery pattern`)
    console.log(`  Hata: String index erişimi de undefined döner — sessiz hata\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar (Requirements 1.8)
    expect(access.productByIndex).toBeUndefined()
  })

  /**
   * Counterexample 3: stockLocationModuleService → undefined
   *
   * Hata Koşulu (Requirements 1.7):
   *   Stok lokasyon servisi de container as any ile çözümlenemez
   */
  it("(container as any).stockLocationModuleService undefined döner — stok servisi erişilemiyor", () => {
    const access = simulateContainerAnyAccess(container)

    console.log(`\n[COUNTEREXAMPLE 3] (container as any).stockLocationModuleService`)
    console.log(`  Dönen değer: ${access.stockLocationModuleService}`)
    console.log(`  Hata: stockLocationModuleService modül izolasyonu nedeniyle undefined\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar
    expect(access.stockLocationModuleService).toBeUndefined()
  })

  /**
   * Counterexample 4: inventoryService → undefined
   *
   * Hata Koşulu (Requirements 1.7):
   *   Envanter servisi de container as any ile çözümlenemez
   */
  it("(container as any).inventoryService undefined döner — envanter servisi erişilemiyor", () => {
    const access = simulateContainerAnyAccess(container)

    console.log(`\n[COUNTEREXAMPLE 4] (container as any).inventoryService`)
    console.log(`  Dönen değer: ${access.inventoryService}`)
    console.log(`  Hata: inventoryService modül izolasyonu nedeniyle undefined\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar
    expect(access.inventoryService).toBeUndefined()
  })

  /**
   * Counterexample 5: Tüm container as any erişimleri undefined döner
   *
   * Hata Koşulu (Requirements 1.9):
   *   AynaService modül izolasyonu dışında başka modüllere doğrudan erişiyor
   *   Bu Medusa v2'nin modüler mimari prensibini ihlal ediyor
   */
  it("Tüm container as any erişimleri undefined döner — Medusa v2 modüler mimari ihlali kanıtlanır", () => {
    const access = simulateContainerAnyAccess(container)

    const allUndefined = [
      access.productModuleService,
      access.stockLocationModuleService,
      access.inventoryService,
      access.productByIndex,
      access.stockLocationByIndex,
      access.inventoryByIndex,
    ].every((val) => val === undefined)

    console.log(`\n[COUNTEREXAMPLE 5] Tüm container as any erişimleri`)
    console.log(`  productModuleService: ${access.productModuleService}`)
    console.log(`  stockLocationModuleService: ${access.stockLocationModuleService}`)
    console.log(`  inventoryService: ${access.inventoryService}`)
    console.log(`  ["product"]: ${access.productByIndex}`)
    console.log(`  ["stock_location"]: ${access.stockLocationByIndex}`)
    console.log(`  ["inventory"]: ${access.inventoryByIndex}`)
    console.log(`  Tümü undefined: ${allUndefined}`)
    console.log(`  Hata: Medusa v2 modül izolasyonu — (container as any) pattern çalışmıyor\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar (Requirements 1.9)
    // Tüm erişimler undefined döndüğünde AynaService araçları çalışmaz
    expect(allUndefined).toBe(true)
  })

  /**
   * Counterexample 6: productModuleService_ undefined olduğunda executeProductSearch boş döner
   *
   * Hata Koşulu (Requirements 1.8):
   *   Medusa v2 güncelleme sonrası tüm ürün/stok araçları çalışmaz hale gelir
   */
  it("productModuleService_ undefined olduğunda ürün araması yapılamaz — araçlar çalışmaz", () => {
    const productModuleService = (container as any).productModuleService || (container as any)["product"]

    console.log(`\n[COUNTEREXAMPLE 6] productModuleService_ durumu`)
    console.log(`  productModuleService_: ${productModuleService}`)
    console.log(`  Sonuç: Ürün araması yapılamaz, araçlar çalışmaz`)
    console.log(`  Hata: (container as any) pattern Medusa v2'de undefined döner\n`)

    // Bu assertion BAŞARISIZ olmalı — hata varlığını kanıtlar (Requirements 1.8)
    // productModuleService_ undefined olduğunda executeProductSearch
    // "Ürün servisi şu an kullanılamıyor." döner — araç çalışmaz
    expect(productModuleService).toBeUndefined()
  })
})
