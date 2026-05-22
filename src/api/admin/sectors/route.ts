/**
 * GET /admin/sectors
 *
 * Admin panelinin "yeni mağaza oluştur" ekranında sektör listesi
 * ve her sektörün varsayılan kuralları/özellikleri için kullanılır.
 *
 * Yetkilendirme: admin JWT (authenticate middleware tarafından sağlanır).
 *
 * Bu salt-okunur statik bir endpoint; sektörler kod-zamanı sabitidir,
 * dolayısıyla rate-limit veya cache gerekmiyor.
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SectorRegistry } from "../../../lib/sector-framework"
import { withErrorHandler } from "../../../lib/error-handler"

export const GET = withErrorHandler(async (_req: MedusaRequest, res: MedusaResponse) => {
    const sectors = SectorRegistry.list().map((s) => ({
        code: s.code,
        displayName: s.displayName,
        description: s.description,
        defaultFeatures: s.defaultFeatures,
        defaultSettings: s.defaultSettings,
        rules: s.rules,
        ai: {
            tone: s.ai.tone,
            expertise: s.ai.expertise,
            contentStyle: s.ai.contentStyle,
        },
    }))

    res.json({
        count: sectors.length,
        sectors,
    })
})
