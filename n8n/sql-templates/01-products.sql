-- ============================================================
-- HALLUCINATION KILLER — Ürün Kataloğu Sorguları
-- Hedef DB: medusa-genesis (Medusa v2 core tables)
-- ============================================================
-- n8n'de "Postgres" node → bu sorguları Operation: "Execute Query" ile kullanın.
-- {{ $json.query }} gibi n8n expression'ları ile parametrik hale getirebilirsiniz.

-- ──────────────────────────────────────────────
-- 1. ÜRÜN ARAMA (Anahtar kelime bazlı)
-- n8n parametresi: {{ $json.search_term }}
-- ──────────────────────────────────────────────
-- USAGE: Kullanıcı "klor tableti var mı?" dediğinde bu sorguyu çalıştırın.
SELECT
    p.id            AS product_id,
    p.title         AS product_title,
    p.subtitle,
    p.description,
    p.handle        AS slug,
    p.status,
    p.created_at,
    p.updated_at
FROM product p
-- TENANT İZOLASYONU İÇİN EKLENMELİDİR (Eğer tenant_id mevcutsa):
-- JOIN product_sales_channel psc ON psc.product_id = p.id
-- JOIN tenant_sales_channel tsc ON tsc.sales_channel_id = psc.sales_channel_id
-- WHERE tsc.tenant_id = '{{ $json.tenant_id }}'
WHERE p.deleted_at IS NULL
  AND p.status = 'published'
  AND (
      p.title       ILIKE '%' || '{{ $json.search_term }}' || '%'
   OR p.description ILIKE '%' || '{{ $json.search_term }}' || '%'
   OR p.handle      ILIKE '%' || '{{ $json.search_term }}' || '%'
   OR p.subtitle    ILIKE '%' || '{{ $json.search_term }}' || '%'
  )
ORDER BY p.updated_at DESC
LIMIT 10;


-- ──────────────────────────────────────────────
-- 2. ÜRÜN DETAY (ID ile)
-- n8n parametresi: {{ $json.product_id }}
-- ──────────────────────────────────────────────
SELECT
    p.id,
    p.title,
    p.subtitle,
    p.description,
    p.handle,
    p.status,
    p.weight,
    p.length,
    p.height,
    p.width,
    p.metadata,
    p.created_at
FROM product p
WHERE p.id = '{{ $json.product_id }}'
  AND p.deleted_at IS NULL;


-- ──────────────────────────────────────────────
-- 3. ÜRÜN VARYANTLARI + FİYATLARI
-- n8n parametresi: {{ $json.product_id }}
-- ──────────────────────────────────────────────
-- Bu sorgu bir ürünün tüm varyantlarını ve ilişkili fiyat bilgilerini getirir.
SELECT
    pv.id           AS variant_id,
    pv.title        AS variant_title,
    pv.sku,
    pv.barcode,
    pv.manage_inventory,
    pv.allow_backorder,
    pp.amount       AS price_amount,
    pp.currency_code
FROM product_variant pv
LEFT JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
LEFT JOIN price_set ps ON ps.id = pvps.price_set_id
LEFT JOIN price pp ON pp.price_set_id = ps.id
WHERE pv.product_id = '{{ $json.product_id }}'
  AND pv.deleted_at IS NULL
ORDER BY pv.created_at;


-- ──────────────────────────────────────────────
-- 4. KATEGORİLER LİSTESİ
-- ──────────────────────────────────────────────
SELECT
    pc.id           AS category_id,
    pc.name         AS category_name,
    pc.handle       AS category_slug,
    pc.description,
    pc.is_active,
    pc.rank
FROM product_category pc
WHERE pc.deleted_at IS NULL
  AND pc.is_active = true
ORDER BY pc.rank ASC, pc.name ASC;


-- ──────────────────────────────────────────────
-- 5. KATEGORİYE GÖRE ÜRÜNLER
-- n8n parametresi: {{ $json.category_id }}
-- ──────────────────────────────────────────────
SELECT
    p.id            AS product_id,
    p.title,
    p.handle,
    p.status
FROM product p
JOIN product_category_product pcp ON pcp.product_id = p.id
WHERE pcp.product_category_id = '{{ $json.category_id }}'
  AND p.deleted_at IS NULL
  AND p.status = 'published'
ORDER BY p.title;


-- ──────────────────────────────────────────────
-- 6. TOPLAM ÜRÜN SAYISI (İstatistik)
-- ──────────────────────────────────────────────
SELECT
    COUNT(*)                                                    AS total_products,
    COUNT(*) FILTER (WHERE status = 'published')                AS published,
    COUNT(*) FILTER (WHERE status = 'draft')                    AS draft
FROM product
WHERE deleted_at IS NULL;
