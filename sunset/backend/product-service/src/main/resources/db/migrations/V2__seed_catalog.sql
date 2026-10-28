-- Demo catalog for the SUNSET storefront. Stable UUIDs keep the seed idempotent.
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS id UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE sizes ADD COLUMN IF NOT EXISTS label VARCHAR(255);
UPDATE sizes SET label = name WHERE label IS NULL;
ALTER TABLE sizes ALTER COLUMN label SET NOT NULL;

INSERT INTO categories (id, name) VALUES
('10000000-0000-0000-0000-000000000001','Боди'),('10000000-0000-0000-0000-000000000002','Пиджаки'),('10000000-0000-0000-0000-000000000003','Платья'),('10000000-0000-0000-0000-000000000004','Джинсы'),('10000000-0000-0000-0000-000000000005','Кофты'),('10000000-0000-0000-0000-000000000006','Аксессуары'),('10000000-0000-0000-0000-000000000007','Верхняя одежда')
ON CONFLICT (name) DO NOTHING;

INSERT INTO colors (id, name, hex_code) VALUES
('20000000-0000-0000-0000-000000000001','Чёрный','#272421'),('20000000-0000-0000-0000-000000000002','Молочный','#EEE8DE'),('20000000-0000-0000-0000-000000000003','Графит','#595B5D'),('20000000-0000-0000-0000-000000000004','Деним','#68788D'),('20000000-0000-0000-0000-000000000005','Бежевый','#B9A99A')
ON CONFLICT (name) DO NOTHING;

INSERT INTO sizes (id, name, label, type, gender, region, sort_order) VALUES
('30000000-0000-0000-0000-000000000001','XS','XS','clothing','women','RU',1),('30000000-0000-0000-0000-000000000002','S','S','clothing','women','RU',2),('30000000-0000-0000-0000-000000000003','M','M','clothing','women','RU',3),('30000000-0000-0000-0000-000000000004','L','L','clothing','women','RU',4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, name, description, price, created_at) VALUES
('40000000-0000-0000-0000-000000000001','Боди BASE','Мягкое боди из эластичного трикотажа с аккуратным круглым вырезом.',1990,NOW()),
('40000000-0000-0000-0000-000000000002','Пиджак LINE','Свободный двубортный пиджак с мягкой линией плеча.',5990,NOW()-INTERVAL '1 day'),
('40000000-0000-0000-0000-000000000003','Боди SCULPT','Плотное моделирующее боди с выразительным силуэтом.',3290,NOW()-INTERVAL '2 days'),
('40000000-0000-0000-0000-000000000004','Платье SILENCE','Лаконичное платье миди для вечерних и повседневных образов.',7490,NOW()-INTERVAL '3 days'),
('40000000-0000-0000-0000-000000000005','Джинсы CLASSIC','Прямые джинсы из плотного денима с высокой посадкой.',3790,NOW()-INTERVAL '4 days'),
('40000000-0000-0000-0000-000000000006','Очки SOLAR','Солнцезащитные очки в тонкой универсальной оправе.',1590,NOW()-INTERVAL '5 days'),
('40000000-0000-0000-0000-000000000007','Часы STREET STYLE','Минималистичные часы с лаконичным циферблатом.',4290,NOW()-INTERVAL '6 days'),
('40000000-0000-0000-0000-000000000008','Сумка FLASH','Компактная поясная сумка с регулируемым ремнём.',2390,NOW()-INTERVAL '7 days'),
('40000000-0000-0000-0000-000000000009','Толстовка COMFY','Объёмная толстовка из плотного хлопка с мягкой изнанкой.',2890,NOW()-INTERVAL '8 days'),
('40000000-0000-0000-0000-000000000010','Кепка DAILY','Базовая хлопковая кепка с регулируемой застёжкой.',1290,NOW()-INTERVAL '9 days')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, price=EXCLUDED.price;

INSERT INTO images (id, url) VALUES
('50000000-0000-0000-0000-000000000001','/images/products/1.png'),('50000000-0000-0000-0000-000000000002','/images/products/2.png'),('50000000-0000-0000-0000-000000000003','/images/products/3.png'),('50000000-0000-0000-0000-000000000004','/images/products/4.png'),('50000000-0000-0000-0000-000000000005','/images/products/5.png'),('50000000-0000-0000-0000-000000000006','/images/products/6.png'),('50000000-0000-0000-0000-000000000007','/images/products/7.png'),('50000000-0000-0000-0000-000000000008','/images/products/8.png'),('50000000-0000-0000-0000-000000000009','/images/products/9.png'),('50000000-0000-0000-0000-000000000010','/images/products/10.png') ON CONFLICT (id) DO UPDATE SET url=EXCLUDED.url;

INSERT INTO product_images (id, product_id, image_id, type_image) SELECT ('60000000-0000-0000-0000-' || LPAD(n::text,12,'0'))::uuid, ('40000000-0000-0000-0000-' || LPAD(n::text,12,'0'))::uuid, ('50000000-0000-0000-0000-' || LPAD(n::text,12,'0'))::uuid, 'front' FROM generate_series(1,10) n ON CONFLICT (product_id,image_id) DO NOTHING;

INSERT INTO product_categories (product_id, category_id) VALUES
('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),('40000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002'),('40000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001'),('40000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000003'),('40000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000004'),('40000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000006'),('40000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000006'),('40000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000006'),('40000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000005'),('40000000-0000-0000-0000-000000000010','10000000-0000-0000-0000-000000000006') ON CONFLICT DO NOTHING;

INSERT INTO product_colors (product_id, color_id) SELECT ('40000000-0000-0000-0000-' || LPAD(n::text,12,'0'))::uuid, CASE WHEN n IN (1,3,6,7,8,10) THEN '20000000-0000-0000-0000-000000000001'::uuid WHEN n=5 THEN '20000000-0000-0000-0000-000000000004'::uuid WHEN n IN (2,4) THEN '20000000-0000-0000-0000-000000000005'::uuid ELSE '20000000-0000-0000-0000-000000000003'::uuid END FROM generate_series(1,10) n ON CONFLICT DO NOTHING;

INSERT INTO product_stock (product_id,size_id,color_id,quantity)
SELECT p.id, s.id, pc.color_id, 4 + ((ROW_NUMBER() OVER ())::int % 9) FROM products p JOIN product_colors pc ON pc.product_id=p.id CROSS JOIN sizes s WHERE p.id::text LIKE '40000000-%' ON CONFLICT (product_id,size_id,color_id) DO UPDATE SET quantity=EXCLUDED.quantity;
