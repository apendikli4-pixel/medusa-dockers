// FIXTURE (audit:test) — immutable-memory kuralını tetiklemeli. ÜRETİM KODU DEĞİLDİR.
export async function bad(aynaService: any, em: any) {
    await aynaService.deleteMemoryTruths(["id1", "id2"])
    await em.execute("DELETE FROM memory_insight WHERE id = 'x'")
    return true
}
