// FIXTURE (audit:test) — rls-bypass-forbidden kuralını tetiklemeli. ÜRETİM KODU DEĞİLDİR.
export async function bad(em: any, query: any) {
    await em.find("Thing", {}, { filters: { tenantIsolation: false } })
    query.disableFilter("tenantIsolation")
    const sys = "__system__"
    const sql = "SET app.current_tenant_id = 'x'"
    return [sys, sql]
}
