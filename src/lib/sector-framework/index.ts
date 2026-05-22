/**
 * Sector Framework — Public API
 *
 * Bu modülden import yapan dosyalar için tek giriş noktasıdır.
 *
 * Import örnekleri:
 *   import { SectorRegistry, SectorRulesService } from "@/lib/sector-framework"
 *   import type { SectorCode, SectorConfig } from "@/lib/sector-framework"
 *
 * NOT: Bu dosya import edildiğinde tüm sektör tanımları otomatik yüklenir
 * (side-effect import "./sectors"). Bu sayede tüketici tarafın ek bir
 * "tüm sektörleri kaydet" çağrısı yapması gerekmez.
 */

// Sektör dosyalarını yükle (her biri SectorRegistry'ye kendini kaydeder)
import "./sectors"

export { SectorRegistry } from "./registry"
export { SectorRulesService } from "./rules-service"

export type {
    SectorCode,
    SectorConfig,
    SectorRules,
    SectorAIBehavior,
    SectorRuleViolation,
    SectorValidationResult,
} from "./types"

export { SECTOR_CODES } from "./types"

export type { ValidateCartItemInput } from "./rules-service"
