-- ============================================================
-- HALLUCINATION KILLER — Müşteri Profil Sorguları
-- Hedef DB: medusa-genesis (Medusa v2 core tables)
-- ============================================================

-- 1. MÜŞTERİ BİLGİSİ (Customer ID ile)
SELECT
    c.id, c.email, c.first_name, c.last_name, c.phone,
    c.has_account, c.metadata, c.created_at AS member_since
FROM customer c
WHERE c.id = '{{ $json.customer_id }}' AND c.deleted_at IS NULL;

-- 2. MÜŞTERİ GRUPLARI
SELECT cg.id AS group_id, cg.name AS group_name, cg.metadata
FROM customer_group cg WHERE cg.deleted_at IS NULL ORDER BY cg.name;

-- 3. MÜŞTERİ ADRESLERI
SELECT ca.id, ca.address_1, ca.city, ca.province, ca.postal_code,
    ca.country_code, ca.phone, ca.is_default_shipping
FROM customer_address ca
WHERE ca.customer_id = '{{ $json.customer_id }}'
ORDER BY ca.is_default_shipping DESC;

-- 4. MÜŞTERİ İSTEK LİSTESİ (Wishlist — Custom module)
SELECT wi.id, wi.product_id, wi.notify_on_restock, wi.created_at,
    p.title AS product_title
FROM wishlist_item wi
LEFT JOIN product p ON p.id = wi.product_id
WHERE wi.customer_id = '{{ $json.customer_id }}' AND wi.deleted_at IS NULL
ORDER BY wi.created_at DESC;

-- 5. AYNA HAFIZA — Müşteri Insights (Custom module)
SELECT mi.id, mi.entity_id AS customer_id, mi.content, mi.is_archived, mi.created_at
FROM memory_insight mi
WHERE mi.entity_id = '{{ $json.customer_id }}' AND mi.is_archived = false
ORDER BY mi.created_at DESC LIMIT 20;

-- 6. MÜŞTERİ TOPLAM İSTATİSTİKLERİ
SELECT
    COUNT(*) AS total_customers,
    COUNT(*) FILTER (WHERE has_account = true) AS registered,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_last_30d
FROM customer WHERE deleted_at IS NULL;
