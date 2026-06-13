// FIXTURE (audit:test) — TEMİZ: rls-bypass-forbidden TETİKLENMEMELİ. ÜRETİM KODU DEĞİLDİR.
export async function good(query: any) {
    // Normal tenant-bağlamlı sorgu; global filter + RLS otomatik izolasyon sağlar.
    const { data } = await query.graph({ entity: "product", fields: ["id", "title"] })
    return data
}
