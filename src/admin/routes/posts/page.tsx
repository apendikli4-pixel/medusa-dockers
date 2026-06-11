import { Container, Heading, Table, StatusBadge, Button } from "@medusajs/ui"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import { useEffect, useState } from "react"
import { Post, PostListResponse } from "../../../types"

const PostsPage = () => {
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    // Çoklu mağaza: yazının ait olduğu mağazayı listede göstermek için.
    const [tenants, setTenants] = useState<any[]>([])

    useEffect(() => {
        // Fetch posts from Admin API
        fetch("/admin/posts")
            .then((res) => res.json())
            .then((data: PostListResponse) => {
                setPosts(data.posts || [])
                setLoading(false)
            })
            .catch((err) => {
                console.error("Fetch error:", err)
                setLoading(false)
            })
    }, [])

    useEffect(() => {
        fetch("/admin/tenants", { credentials: "include" })
            .then((r) => r.json())
            .then((d) => setTenants(d.tenants || []))
            .catch(() => { /* tek mağaza modu */ })
    }, [])

    const multiStore = tenants.length > 1
    const tenantName = (id?: string) => tenants.find((t) => t.id === id)?.name || "—"

    return (
        <Container className="p-8">
            <div className="flex justify-between items-center mb-6">
                {/* @ts-ignore */}
                <Heading level="h1">Blog Yönetimi</Heading>
                <Button variant="secondary" onClick={() => window.location.href = "/app/posts/create"}>
                    + Yeni Yazı
                </Button>
            </div>

            <Table>
                <Table.Header>
                    <Table.Row>
                        <Table.HeaderCell>Başlık</Table.HeaderCell>
                        <Table.HeaderCell>Slug (URL)</Table.HeaderCell>
                        {multiStore && <Table.HeaderCell>Mağaza</Table.HeaderCell>}
                        <Table.HeaderCell>Durum</Table.HeaderCell>
                        <Table.HeaderCell>Tarih</Table.HeaderCell>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {loading ? (
                        <Table.Row>
                            <Table.Cell {...({ colSpan: multiStore ? 5 : 4 } as any)} className="text-center p-4">Yükleniyor...</Table.Cell>
                        </Table.Row>
                    ) : posts.length === 0 ? (
                        <Table.Row>
                            <Table.Cell {...({ colSpan: multiStore ? 5 : 4 } as any)} className="text-center p-4">Henüz hiç yazı yok.</Table.Cell>
                        </Table.Row>
                    ) : (
                        posts.map((post) => (
                            <Table.Row key={post.id}>
                                <Table.Cell>
                                    <a href={`/app/posts/${post.id}`} className="hover:text-ui-fg-interactive hover:underline">
                                        {post.title}
                                    </a>
                                </Table.Cell>
                                <Table.Cell className="text-ui-fg-subtle">{post.slug}</Table.Cell>
                                {multiStore && (
                                    <Table.Cell>
                                        <StatusBadge color="blue">{tenantName((post as any).tenant_id)}</StatusBadge>
                                    </Table.Cell>
                                )}
                                <Table.Cell>
                                    <StatusBadge color={post.status === "published" ? "green" : "grey"}>
                                        {post.status === "published" ? "Yayınlanmış" : "Taslak"}
                                    </StatusBadge>
                                </Table.Cell>
                                <Table.Cell>{new Date(post.created_at).toLocaleDateString("tr-TR")}</Table.Cell>
                            </Table.Row>
                        ))
                    )}
                </Table.Body>
            </Table>
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "Blog",
    icon: DocumentText,
})

export default PostsPage
