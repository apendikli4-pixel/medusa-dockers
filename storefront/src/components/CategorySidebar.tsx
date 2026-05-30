import Link from "next/link"
import { listCategories } from "@/lib/server/data"

export default async function CategorySidebar({
    countryCode,
    activeHandle,
}: {
    countryCode: string
    activeHandle?: string
}) {
    const cats = await listCategories()
    return (
        <aside className="ag-sidebar">
            <h3 className="ag-sidebar-title">Kategoriler</h3>
            <ul className="ag-sidebar-list">
                <li>
                    <Link
                        href={`/${countryCode}`}
                        className={`ag-sidebar-link ${!activeHandle ? "active" : ""}`}
                    >
                        Tümü
                    </Link>
                </li>
                {cats.map((c) => (
                    <li key={c.id}>
                        <Link
                            href={`/${countryCode}/categories/${c.handle}`}
                            className={`ag-sidebar-link ${activeHandle === c.handle ? "active" : ""}`}
                        >
                            {c.name}
                        </Link>
                    </li>
                ))}
            </ul>
        </aside>
    )
}
