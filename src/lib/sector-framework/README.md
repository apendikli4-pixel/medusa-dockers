# Sector Framework

Çoklu mağaza (multi-tenant) sistemde, her mağazanın **faaliyet sektörüne** göre
farklı iş kuralları, varsayılan ayarlar ve AI davranışı uygulanmasını sağlar.

## Neden?

Aynı Medusa kurulumunda hem bir perakende mağazası, hem bir HORECA rezervasyon
sistemi, hem de bir B2B toptan satış sitesi çalışıyor. Her birinin farklı
ihtiyaçları var:

- **Retail**: stok zorunlu, MOQ yok, B2B-only ürünler gizli
- **HORECA**: teslimat tarihi zorunlu, backorder mümkün, KDV %10
- **B2B**: MOQ aktif, bulk pricing, B2B-only ürünler görünür
- **Fashion**: beden tablosu zorunlu, KDV %10, sezon koleksiyonu

Bu kurallar tek bir `if (tenant.sector === "x")` zincirinde değil, her sektörün
**kendi dosyasında** tanımlı — yeni sektör eklemek diğer kodları değiştirmez.

## Mimari

```
src/lib/sector-framework/
├── types.ts            SectorConfig, SectorRules, validation tipleri
├── registry.ts         SectorRegistry (Strategy pattern, static class)
├── rules-service.ts    SectorRulesService (pure functions)
├── index.ts            Public API + side-effect "./sectors" import
└── sectors/
    ├── index.ts        Tüm sektör dosyalarını yükler
    ├── retail.ts
    ├── horeca.ts
    ├── b2b.ts
    └── fashion.ts
```

## Kullanım

### Bir sektörün kuralını okumak

```ts
import { SectorRegistry } from "@/lib/sector-framework"

const config = SectorRegistry.get("b2b")
console.log(config.rules.defaultMoq)   // 10
console.log(config.ai.tone)             // "resmi ve güven veren"
console.log(config.defaultSettings.taxRate)  // 20
```

### Sepet öğesini doğrulamak

```ts
import { SectorRulesService } from "@/lib/sector-framework"

const result = SectorRulesService.validateCartItem({
    sector: tenant.sector,
    quantity: 5,
    productMoq: product.metadata?.moq,
    tenantDefaultMoq: tenant.settings?.default_moq,
    requestedDate: req.body.requested_date,
    isB2BOnly: product.metadata?.b2b_only === true,
    availableStock: stockLevel,
})

if (!result.valid) {
    return res.status(400).json({
        error: result.violation,
        message: result.message,
        honestyNote: result.honestyNote,
    })
}
```

### Yeni tenant'a sektör varsayılanlarını uygulamak

```ts
// src/workflows/create-tenant.ts içinden
const sectorConfig = SectorRegistry.get(input.sector)

const tenant = await tenantService.create({
    name: input.name,
    slug: input.slug,
    sector: input.sector,
    features: input.features ?? sectorConfig.defaultFeatures,
    settings: {
        ...sectorConfig.defaultSettings,
        ...input.settings,  // kullanıcı override'ı son söze sahip
    },
})
```

## Yeni sektör eklemek

1. `sectors/<yeni-sektor>.ts` dosyası oluştur ve `SectorRegistry.register({...})`
   ile kaydet
2. `sectors/index.ts` dosyasına `import "./yeni-sektor"` ekle
3. `types.ts` içindeki `SECTOR_CODES` dizisine kodu ekle
4. `src/modules/tenant/service.ts` içindeki `VALID_SECTORS` dizisine de ekle
   (tenant model validation için)
5. Test ekle (`src/lib/__tests__/sector-framework.spec.ts`)

## MCG ile farklar

Bu framework, Mirror Core Genesis'teki sector-framework prototipinin **gerçek
implementasyonudur**. MCG'deki şu sorunlar düzeltildi:

| MCG | Burada |
|---|---|
| `const moq = 50` hardcoded | `productMoq → tenantDefaultMoq → sectorDefault → 1` zinciri |
| `availableStock = 5` sahte | Çağıran taraf gerçek inventory'den alıp parametre olarak verir |
| Boş `customModels: []` | Kaldırıldı — gerçek kullanımı olunca eklenir |
| `(req as any).context \|\| {sector: "RETAIL"}` demo fallback | Tenant resolver middleware zorunlu; yoksa 400 döner |
| AI davranışı tenant module'de hardcoded | SectorRegistry'den okunur (tenant module backward-compat sarıcı) |
| Sektör kayıt çift yapılabilirdi | İkinci `register()` exception atar |
| Test yok | Jest spec dosyası (15+ test) |

## Test

```powershell
npx jest src/lib/__tests__/sector-framework.spec.ts
```
