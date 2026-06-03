import Link from "next/link"
import { listCategories } from "@/lib/server/data"
import { ChevronRight, Filter } from "lucide-react"

export default async function CategorySidebar({
    countryCode,
    activeHandle,
}: {
    countryCode: string
    activeHandle?: string
}) {
    const cats = await listCategories()
    return (
        <aside className="glass-panel rounded-2xl p-5 sticky top-24">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                <Filter size={18} className="text-gray-400" />
                <h3 className="font-heading font-semibold text-[0.85rem] tracking-[0.15em] uppercase text-gray-500">
                    Kategoriler
                </h3>
            </div>
            <ul className="flex flex-col gap-1.5">
                <li>
                    <Link
                        href={`/${countryCode}`}
                        className={`group flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                            !activeHandle 
                                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" 
                                : "text-gray-600 hover:bg-gray-50 hover:text-blue-600 hover:pl-5"
                        }`}
                    >
                        <span>Tümü</span>
                        {!activeHandle && <ChevronRight size={16} className="text-white/70" />}
                    </Link>
                </li>
                {cats.map((c) => {
                    const isActive = activeHandle === c.handle
                    return (
                        <li key={c.id}>
                            <Link
                                href={`/${countryCode}/categories/${c.handle}`}
                                className={`group flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                                    isActive
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-blue-600 hover:pl-5"
                                }`}
                            >
                                <span>{c.name}</span>
                                {isActive && <ChevronRight size={16} className="text-white/70" />}
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </aside>
    )
}
