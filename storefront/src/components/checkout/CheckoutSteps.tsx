/**
 * Checkout adım göstergesi (breadcrumb).
 */
const STEPS = [
    { key: "address", label: "Adres" },
    { key: "delivery", label: "Kargo" },
    { key: "payment", label: "Ödeme" },
    { key: "review", label: "İnceleme" },
]

export default function CheckoutSteps({ current }: { current: string }) {
    const currentIdx = STEPS.findIndex((s) => s.key === current)
    return (
        <ol className="ag-steps">
            {STEPS.map((s, i) => {
                const done = i < currentIdx
                const active = i === currentIdx
                return (
                    <li
                        key={s.key}
                        className={`ag-step ${active ? "active" : ""} ${done ? "done" : ""}`}
                    >
                        <span className="ag-step-num">{done ? "✓" : i + 1}</span>
                        <span className="ag-step-label">{s.label}</span>
                    </li>
                )
            })}
        </ol>
    )
}
