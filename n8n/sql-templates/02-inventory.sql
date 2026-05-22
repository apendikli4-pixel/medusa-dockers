-- ============================================================
-- HALLUCINATION KILLER — Stok / Envanter Sorguları
-- Hedef DB: medusa-genesis (Medusa v2 core tables)
-- ============================================================
-- Medusa v2 envanter mimarisi:
--   product_variant  ──►  inventory_item  ──►  inventory_level (per location)
-- product_variant_inventory_item tablosu bu ikiliyi birbirine bağlar.

-- ──────────────────────────────────────────────
-- 1. ÜRÜN BAZLI STOK DURUMU (Variant ID ile)
-- n8n parametresi: {{ $json.variant_id }}
-- ──────────────────────────────────────────────
-- USAGE: Kullanıcı "bu ürün stokta var mı?" dediğinde bu sorguyu çalıştırın.
SELECT
    pv.id                   AS variant_id,
    pv.title                AS variant_title,
    pv.sku,
    ii.id                   AS inventory_item_id,
    ii.sku                  AS inventory_sku,
    il.location_id,
    il.stocked_quantity,
    il.reserved_quantity,
    (il.stocked_quantity - il.reserved_quantity)  AS available_quantity,
    il.incoming_quantity
FROM product_variant pv
JOIN product_variant_inventory_item pvii ON pvii.variant_id = pv.id
JOIN inventory_item ii ON ii.id = pvii.inventory_item_id
LEFT JOIN inventory_level il ON il.inventory_item_id = ii.id
WHERE pv.id = '{{ $json.variant_id }}'
  AND pv.deleted_at IS NULL
  AND ii.deleted_at IS NULL;


-- ──────────────────────────────────────────────
-- 2. ÜRÜN ID İLE TÜM VARYANT STOKLARI
-- n8n parametresi: {{ $json.product_id }}
-- ──────────────────────────────────────────────
SELECT
    p.id                    AS product_id,
    p.title                 AS product_title,
    pv.id                   AS variant_id,
    pv.title                AS variant_title,
    pv.sku,
    il.stocked_quantity,
    il.reserved_quantity,
    (il.stocked_quantity - il.reserved_quantity) AS available_quantity,
    il.incoming_quantity,
    il.location_id
FROM product p
JOIN product_variant pv ON pv.product_id = p.id
JOIN product_variant_inventory_item pvii ON pvii.variant_id = pv.id
JOIN inventory_item ii ON ii.id = pvii.inventory_item_id
LEFT JOIN inventory_level il ON il.inventory_item_id = ii.id
WHERE p.id = '{{ $json.product_id }}'
  AND p.deleted_at IS NULL
  AND pv.deleted_at IS NULL
  AND ii.deleted_at IS NULL;


-- ──────────────────────────────────────────────
-- 3. DÜŞÜK STOK ALARM (Eşik değeri altındaki ürünler)
-- n8n parametresi: {{ $json.low_stock_threshold }} (varsayılan: 5)
-- ──────────────────────────────────────────────
-- USAGE: Proaktif stok uyarı workflow'unda kullanılır.
SELECT
    p.title                 AS product_title,
    pv.id                   AS variant_id,
    pv.title                AS variant_title,
    pv.sku,
    il.stocked_quantity,
    il.reserved_quantity,
    (il.stocked_quantity - il.reserved_quantity) AS available_quantity,
    il.location_id
FROM product p
JOIN product_variant pv ON pv.product_id = p.id
JOIN product_variant_inventory_item pvii ON pvii.variant_id = pv.id
JOIN inventory_item ii ON ii.id = pvii.inventory_item_id
JOIN inventory_level il ON il.inventory_item_id = ii.id
WHERE p.deleted_at IS NULL
  AND pv.deleted_at IS NULL
  AND ii.deleted_at IS NULL
  AND p.status = 'published'
  AND (il.stocked_quantity - il.reserved_quantity) < {{ $json.low_stock_threshold || 5 }}
ORDER BY (il.stocked_quantity - il.reserved_quantity) ASC;


-- ──────────────────────────────────────────────
-- 4. STOK LOKASYON (DEPO) LİSTESİ
-- ──────────────────────────────────────────────
SELECT
    sl.id           AS location_id,
    sl.name         AS location_name,
    sl.metadata,
    sl.created_at
FROM stock_location sl
WHERE sl.deleted_at IS NULL
ORDER BY sl.name;


-- ──────────────────────────────────────────────
-- 5. TÜM ENVANTER ÖZETİ
-- ──────────────────────────────────────────────
SELECT
    COUNT(DISTINCT ii.id)   AS total_inventory_items,
    COUNT(DISTINCT il.id)   AS total_inventory_levels,
    SUM(il.stocked_quantity)    AS total_stocked,
    SUM(il.reserved_quantity)   AS total_reserved,
    SUM(il.stocked_quantity - il.reserved_quantity) AS total_available,
    SUM(il.incoming_quantity)   AS total_incoming
FROM inventory_item ii
LEFT JOIN inventory_level il ON il.inventory_item_id = ii.id
WHERE ii.deleted_at IS NULL;


-- ──────────────────────────────────────────────
-- 6. STOKTA OLMAYAN ÜRÜNLER (Out of Stock)
-- ──────────────────────────────────────────────
SELECT
    p.id            AS product_id,
    p.title         AS product_title,
    pv.id           AS variant_id,
    pv.title        AS variant_title,
    pv.sku
FROM product p
JOIN product_variant pv ON pv.product_id = p.id
JOIN product_variant_inventory_item pvii ON pvii.variant_id = pv.id
JOIN inventory_item ii ON ii.id = pvii.inventory_item_id
JOIN inventory_level il ON il.inventory_item_id = ii.id
WHERE p.deleted_at IS NULL
  AND pv.deleted_at IS NULL
  AND ii.deleted_at IS NULL
  AND p.status = 'published'
  AND (il.stocked_quantity - il.reserved_quantity) <= 0
ORDER BY p.title;
