/**
 * Content Engine Types
 * Medusa v2 compliant type definitions for the Content Engine module
 */

// ============================================================================
// POST TYPES
// ============================================================================

export type PostStatus = "draft" | "published" | "archived"

export interface Post {
    id: string
    title: string
    slug: string
    content: string
    image: string | null
    metadata: Record<string, any> | null
    status: PostStatus
    published_at: Date | null
    created_at: Date
    updated_at: Date
    created_by: string | null // Yeni eklendi
    // SEO Fields
    author: string | null
    excerpt: string | null
    seo_title: string | null
    seo_description: string | null
    // Analytics
    view_count: number
}

export interface CreatePostInput {
    title: string
    slug: string
    content: string
    image?: string | null
    metadata?: Record<string, any> | null
    status?: PostStatus
    published_at?: Date | null
    // SEO Fields
    author?: string | null
    excerpt?: string | null
    seo_title?: string | null
    seo_description?: string | null
}

export interface UpdatePostInput {
    title?: string
    slug?: string
    content?: string
    image?: string | null
    metadata?: Record<string, any> | null
    status?: PostStatus
    published_at?: Date | null
    // SEO Fields
    author?: string | null
    excerpt?: string | null
    seo_title?: string | null
    seo_description?: string | null
    // Analytics (increment)
    view_count?: number
}

export interface ListPostsFilters {
    status?: PostStatus
    slug?: string
}

export interface ListPostsOptions {
    skip?: number
    take?: number
    order?: Record<string, "ASC" | "DESC">
    select?: string[]
}

// ============================================================================
// SERVICE INTERFACE
// ============================================================================

export interface IContentEngineService {
    // Post CRUD
    createPosts(data: CreatePostInput): Promise<Post>
    listPosts(filters?: ListPostsFilters, options?: ListPostsOptions): Promise<Post[]>
    listAndCountPosts(filters?: ListPostsFilters, options?: ListPostsOptions): Promise<[Post[], number]>
    retrievePost(id: string): Promise<Post | null>
    updatePosts(id: string, data: UpdatePostInput): Promise<Post>
    deletePosts(id: string): Promise<void>
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PostListResponse {
    posts: Post[]
    count: number
    limit: number
    offset: number
}

export interface PostSingleResponse {
    post: Post
    message?: string
}

export interface PostErrorResponse {
    error: string
    details?: string
}
