INSERT INTO products (id, name, description, price, created_at)
SELECT
    ('41000000-0000-0000-0000-' || LPAD(n::text, 12, '0'))::uuid,
    (ARRAY['Боди','Пиджак','Платье','Джинсы','Кардиган','Сумка','Тренч'])[1 + ((n - 1) % 7)] || ' ' ||
    (ARRAY['AURA','MUSE','NOVA','LINE','WAVE','SOFT','ICON','PURE'])[1 + ((n - 1) % 8)] || ' ' || LPAD(n::text, 3, '0'),
    'Лимитированная модель SUNSET: современный силуэт, комфортная посадка и тщательно подобранные материалы.',
    1490 + ((n * 370) % 7200),
    NOW() - (n || ' hours')::interval
FROM generate_series(1, 110) n
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,price=EXCLUDED.price;

INSERT INTO product_images (id, product_id, image_id, type_image)
SELECT ('61000000-0000-0000-0000-' || LPAD(n::text,12,'0'))::uuid,
       ('41000000-0000-0000-0000-' || LPAD(n::text,12,'0'))::uuid,
       ('50000000-0000-0000-0000-' || LPAD((1 + ((n - 1) % 10))::text,12,'0'))::uuid,
       'front'
FROM generate_series(1,110) n ON CONFLICT (product_id,image_id) DO NOTHING;

INSERT INTO product_categories (product_id, category_id)
SELECT ('41000000-0000-0000-0000-' || LPAD(n::text,12,'0'))::uuid,
       ('10000000-0000-0000-0000-' || LPAD((1 + ((n - 1) % 7))::text,12,'0'))::uuid
FROM generate_series(1,110) n ON CONFLICT DO NOTHING;

INSERT INTO product_colors (product_id, color_id)
SELECT ('41000000-0000-0000-0000-' || LPAD(n::text,12,'0'))::uuid,
       ('20000000-0000-0000-0000-' || LPAD((1 + ((n - 1) % 5))::text,12,'0'))::uuid
FROM generate_series(1,110) n ON CONFLICT DO NOTHING;

INSERT INTO product_stock (product_id,size_id,color_id,quantity)
SELECT ('41000000-0000-0000-0000-' || LPAD(n::text,12,'0'))::uuid,
       ('30000000-0000-0000-0000-' || LPAD(s::text,12,'0'))::uuid,
       ('20000000-0000-0000-0000-' || LPAD((1 + ((n - 1) % 5))::text,12,'0'))::uuid,
       3 + ((n + s) % 14)
FROM generate_series(1,110) n CROSS JOIN generate_series(1,4) s
ON CONFLICT (product_id,size_id,color_id) DO UPDATE SET quantity=EXCLUDED.quantity;
