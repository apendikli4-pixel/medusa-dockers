// FIXTURE (audit:test) — TEMİZ: immutable-memory TETİKLENMEMELİ. ÜRETİM KODU DEĞİLDİR.
export async function good(memoryService: any) {
    // Yumuşak işaret (arşiv) — değişmez hafızanın meşru güncellemesi.
    await memoryService.updateMemoryTruths({ id: "x", data: { is_archived: true } })
    return true
}
