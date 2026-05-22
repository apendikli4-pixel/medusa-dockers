-- ============================================================
-- HALLUCINATION KILLER — Sipariş Sorguları
-- Hedef DB: medusa-genesis (Medusa v2 core tables)
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. SİPARİŞ TAKİP (Sipariş ID ile)
-- n8n parametresi: {{ $json.order_id }}
-- ──────────────────────────────────────────────
-- USAGE: Müşteri "siparişim nerede?" dediğinde bu sorguyu kullanın.
SELECT
    o.id              AS order_id,
    o.display_id,
    o.status,
    o.email,
    o.currency_code,
    o.created_at      AS order_date,
    o.canceled_at,
    o.metadata
FROM "order" o
WHERE o.id = '{{ $json.order_id }}'
  AND o.deleted_at IS NULL;


-- ──────────────────────────────────────────────
-- 2. SİPARİŞ KALEMLERİ (Sipariş ID ile)
-- n8n parametresi: {{ $json.order_id }}
-- ──────────────────────────────────────────────
SELECT
    oi.id               AS line_item_id,
    oi.title            AS item_title,
    oi.variant_title,
    oi.variant_sku,
    oi.quantity,
    oi.unit_price,
    oi.requires_shipping,
    oi.is_tax_inclusive,
    oi.product_id,
    oi.variant_id
FROM order_line_item oi
WHERE oi.order_id = '{{ $json.order_id }}'
ORDER BY oi.created_at;


-- ──────────────────────────────────────────────
-- 3. MÜŞTERİ SİPARİŞ GEÇMİŞİ (Customer ID ile)
-- n8n parametresi: {{ $json.customer_id }}
-- ──────────────────────────────────────────────
SELECT
    o.id              AS order_id,
    o.display_id,
    o.status,
    o.currency_code,
    o.created_at      AS order_date
FROM "order" o
WHERE o.customer_id = '{{ $json.customer_id }}'
  AND o.deleted_at IS NULL
ORDER BY o.created_at DESC
LIMIT 20;


-- ──────────────────────────────────────────────
-- 4. SON SİPARİŞLER (Admin genel bakış)
-- n8n parametresi: {{ $json.limit }} (varsayılan: 25)
-- ──────────────────────────────────────────────
SELECT
    o.id              AS order_id,
    o.display_id,
    o.status,
    o.email,
    o.currency_code,
    o.created_at      AS order_date
FROM "order" o
WHERE o.deleted_at IS NULL
ORDER BY o.created_at DESC
LIMIT {{ $json.limit || 25 }};


-- ──────────────────────────────────────────────
-- 5. SİPARİŞ İSTATİSTİKLERİ (Dashboard)
-- ──────────────────────────────────────────────
SELECT
    COUNT(*)                                                            AS total_orders,
    COUNT(*) FILTER (WHERE status = 'pending')                          AS pending,
    COUNT(*) FILTER (WHERE status = 'completed')                        AS completed,
    COUNT(*) FILTER (WHERE status = 'canceled' OR canceled_at IS NOT NULL) AS canceled,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')   AS last_24h,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')     AS last_7d,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')    AS last_30d
FROM "order"
WHERE deleted_at IS NULL;


-- ──────────────────────────────────────────────
-- 6. FULFILLMENT DURUMU (Sipariş Kargo Takibi)
-- n8n parametresi: {{ $json.order_id }}
-- ──────────────────────────────────────────────
SELECT
    f.id              AS fulfillment_id,
    f.location_id,
    f.packed_at,
    f.shipped_at,
    f.delivered_at,
    f.canceled_at,
    f.metadata,
    f.created_at
FROM fulfillment f
WHERE f.order_id = '{{ $json.order_id }}'
  AND f.deleted_at IS NULL
ORDER BY f.created_at DESC;
