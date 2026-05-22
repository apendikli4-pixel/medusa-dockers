-- ============================================================
-- HALLUCINATION KILLER — Birleşik Context Sorgusu
-- TEK BİR SORGU ile AI Agent'a verilecek tam context
-- Hedef DB: medusa-genesis (Medusa v2 core tables)
-- ============================================================
-- Bu sorgu n8n'de tek bir Postgres node ile çalıştırılır ve
-- AI Agent'a "sen şu anda bu verilere sahipsin" diye verilir.
--
-- n8n parametreleri:
--   {{ $json.search_term }}  — kullanıcının mesajından çıkarılan anahtar kelime
--   {{ $json.customer_id }}  — (opsiyonel) müşteri kimliği

-- ─── BÖLÜM A: Eşleşen Ürünler + Stok + Fiyat ───
WITH matched_products AS (
    SELECT
        p.id            AS product_id,
        p.title,
        p.handle,
        p.status,
        p.description
    FROM product p
    WHERE p.deleted_at IS NULL
      AND p.status = 'published'
      AND (
          p.title       ILIKE '%' || '{{ $json.search_term }}' || '%'
       OR p.description ILIKE '%' || '{{ $json.search_term }}' || '%'
       OR p.subtitle    ILIKE '%' || '{{ $json.search_term }}' || '%'
      )
    ORDER BY p.updated_at DESC
    LIMIT 8
),
product_stock AS (
    SELECT
        mp.product_id,
        mp.title,
        mp.handle,
        mp.description,
        pv.id           AS variant_id,
        pv.title        AS variant_title,
        pv.sku,
        COALESCE(il.stocked_quantity, 0) AS stocked,
        COALESCE(il.reserved_quantity, 0) AS reserved,
        COALESCE(il.stocked_quantity - il.reserved_quantity, 0) AS available,
        pp_data.price_amount,
        pp_data.currency_code
    FROM matched_products mp
    JOIN product_variant pv ON pv.product_id = mp.product_id AND pv.deleted_at IS NULL
    LEFT JOIN product_variant_inventory_item pvii ON pvii.variant_id = pv.id
    LEFT JOIN inventory_item ii ON ii.id = pvii.inventory_item_id AND ii.deleted_at IS NULL
    LEFT JOIN inventory_level il ON il.inventory_item_id = ii.id
    LEFT JOIN LATERAL (
        SELECT pp.amount AS price_amount, pp.currency_code
        FROM product_variant_price_set pvps
        JOIN price_set ps ON ps.id = pvps.price_set_id
        JOIN price pp ON pp.price_set_id = ps.id
        WHERE pvps.variant_id = pv.id
        LIMIT 1
    ) pp_data ON true
)
SELECT json_build_object(
    'products', (SELECT COALESCE(json_agg(row_to_json(ps)), '[]'::json) FROM product_stock ps),
    'store_stats', (
        SELECT json_build_object(
            'total_published', COUNT(*) FILTER (WHERE status = 'published'),
            'total_draft', COUNT(*) FILTER (WHERE status = 'draft')
        ) FROM product WHERE deleted_at IS NULL
    ),
    'inventory_summary', (
        SELECT json_build_object(
            'total_items', COUNT(DISTINCT ii.id),
            'total_available', SUM(COALESCE(il.stocked_quantity - il.reserved_quantity, 0))
        )
        FROM inventory_item ii
        LEFT JOIN inventory_level il ON il.inventory_item_id = ii.id
        WHERE ii.deleted_at IS NULL
    ),
    'low_stock_alerts', (
        SELECT COALESCE(json_agg(json_build_object(
            'product', p.title, 'variant', pv.title, 'sku', pv.sku,
            'available', il.stocked_quantity - il.reserved_quantity
        )), '[]'::json)
        FROM product p
        JOIN product_variant pv ON pv.product_id = p.id
        JOIN product_variant_inventory_item pvii ON pvii.variant_id = pv.id
        JOIN inventory_item ii ON ii.id = pvii.inventory_item_id
        JOIN inventory_level il ON il.inventory_item_id = ii.id
        WHERE p.deleted_at IS NULL AND p.status = 'published'
          AND (il.stocked_quantity - il.reserved_quantity) < 5
    )
) AS grounding_context;
