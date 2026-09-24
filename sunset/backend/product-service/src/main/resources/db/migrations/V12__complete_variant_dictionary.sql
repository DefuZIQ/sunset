-- Complete variant dictionary used by the admin stock editor and catalog filters.
INSERT INTO colors(id,name,hex_code) VALUES
('61000000-0000-0000-0000-000000000001','Белый','#FFFFFF'),
('61000000-0000-0000-0000-000000000002','Серый','#9A9A9A'),
('61000000-0000-0000-0000-000000000003','Красный','#B73535'),
('61000000-0000-0000-0000-000000000004','Бордовый','#6E2630'),
('61000000-0000-0000-0000-000000000005','Розовый','#D9A0AA'),
('61000000-0000-0000-0000-000000000006','Голубой','#91B8D0'),
('61000000-0000-0000-0000-000000000007','Синий','#294A73'),
('61000000-0000-0000-0000-000000000008','Зелёный','#466B52'),
('61000000-0000-0000-0000-000000000009','Оливковый','#747451'),
('61000000-0000-0000-0000-000000000010','Коричневый','#715142'),
('61000000-0000-0000-0000-000000000011','Жёлтый','#E5BF54'),
('61000000-0000-0000-0000-000000000012','Оранжевый','#CE7540'),
('61000000-0000-0000-0000-000000000013','Фиолетовый','#735A85')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,hex_code=EXCLUDED.hex_code;

INSERT INTO sizes(id,name,label,type,gender,region,description,sort_order) VALUES
-- universal letter sizes
('62000000-0000-0000-0001-000000000001','XXS','XXS','tops','unisex','INT','Международный размер XXS',1),
('62000000-0000-0000-0001-000000000002','XS','XS','tops','unisex','INT','Международный размер XS',2),
('62000000-0000-0000-0001-000000000003','S','S','tops','unisex','INT','Международный размер S',3),
('62000000-0000-0000-0001-000000000004','M','M','tops','unisex','INT','Международный размер M',4),
('62000000-0000-0000-0001-000000000005','L','L','tops','unisex','INT','Международный размер L',5),
('62000000-0000-0000-0001-000000000006','XL','XL','tops','unisex','INT','Международный размер XL',6),
('62000000-0000-0000-0001-000000000007','XXL','XXL','tops','unisex','INT','Международный размер XXL',7),
('62000000-0000-0000-0001-000000000008','3XL','3XL','tops','unisex','INT','Международный размер 3XL',8),
('62000000-0000-0000-0001-000000000009','4XL','4XL','tops','unisex','INT','Международный размер 4XL',9),
-- women dresses, RU 38-56
('62000000-0000-0000-0002-000000000038','38','38','women_dress','women','RU','Платья: российский размер 38',38),
('62000000-0000-0000-0002-000000000040','40','40','women_dress','women','RU','Платья: российский размер 40',40),
('62000000-0000-0000-0002-000000000042','42','42','women_dress','women','RU','Платья: российский размер 42',42),
('62000000-0000-0000-0002-000000000044','44','44','women_dress','women','RU','Платья: российский размер 44',44),
('62000000-0000-0000-0002-000000000046','46','46','women_dress','women','RU','Платья: российский размер 46',46),
('62000000-0000-0000-0002-000000000048','48','48','women_dress','women','RU','Платья: российский размер 48',48),
('62000000-0000-0000-0002-000000000050','50','50','women_dress','women','RU','Платья: российский размер 50',50),
('62000000-0000-0000-0002-000000000052','52','52','women_dress','women','RU','Платья: российский размер 52',52),
('62000000-0000-0000-0002-000000000054','54','54','women_dress','women','RU','Платья: российский размер 54',54),
('62000000-0000-0000-0002-000000000056','56','56','women_dress','women','RU','Платья: российский размер 56',56),
-- women trousers, RU 38-56
('62000000-0000-0000-0003-000000000038','38','38','women_trousers','women','RU','Брюки: российский размер 38',38),
('62000000-0000-0000-0003-000000000040','40','40','women_trousers','women','RU','Брюки: российский размер 40',40),
('62000000-0000-0000-0003-000000000042','42','42','women_trousers','women','RU','Брюки: российский размер 42',42),
('62000000-0000-0000-0003-000000000044','44','44','women_trousers','women','RU','Брюки: российский размер 44',44),
('62000000-0000-0000-0003-000000000046','46','46','women_trousers','women','RU','Брюки: российский размер 46',46),
('62000000-0000-0000-0003-000000000048','48','48','women_trousers','women','RU','Брюки: российский размер 48',48),
('62000000-0000-0000-0003-000000000050','50','50','women_trousers','women','RU','Брюки: российский размер 50',50),
('62000000-0000-0000-0003-000000000052','52','52','women_trousers','women','RU','Брюки: российский размер 52',52),
('62000000-0000-0000-0003-000000000054','54','54','women_trousers','women','RU','Брюки: российский размер 54',54),
('62000000-0000-0000-0003-000000000056','56','56','women_trousers','women','RU','Брюки: российский размер 56',56),
-- men trousers, RU 44-64
('62000000-0000-0000-0004-000000000044','44','44','men_trousers','men','RU','Брюки: российский размер 44',44),
('62000000-0000-0000-0004-000000000046','46','46','men_trousers','men','RU','Брюки: российский размер 46',46),
('62000000-0000-0000-0004-000000000048','48','48','men_trousers','men','RU','Брюки: российский размер 48',48),
('62000000-0000-0000-0004-000000000050','50','50','men_trousers','men','RU','Брюки: российский размер 50',50),
('62000000-0000-0000-0004-000000000052','52','52','men_trousers','men','RU','Брюки: российский размер 52',52),
('62000000-0000-0000-0004-000000000054','54','54','men_trousers','men','RU','Брюки: российский размер 54',54),
('62000000-0000-0000-0004-000000000056','56','56','men_trousers','men','RU','Брюки: российский размер 56',56),
('62000000-0000-0000-0004-000000000058','58','58','men_trousers','men','RU','Брюки: российский размер 58',58),
('62000000-0000-0000-0004-000000000060','60','60','men_trousers','men','RU','Брюки: российский размер 60',60),
('62000000-0000-0000-0004-000000000062','62','62','men_trousers','men','RU','Брюки: российский размер 62',62),
('62000000-0000-0000-0004-000000000064','64','64','men_trousers','men','RU','Брюки: российский размер 64',64),
-- jeans, waist W24-W42
('62000000-0000-0000-0005-000000000024','W24','W24','jeans','unisex','INT','Талия 61 см',24),
('62000000-0000-0000-0005-000000000025','W25','W25','jeans','unisex','INT','Талия 64 см',25),
('62000000-0000-0000-0005-000000000026','W26','W26','jeans','unisex','INT','Талия 66 см',26),
('62000000-0000-0000-0005-000000000027','W27','W27','jeans','unisex','INT','Талия 69 см',27),
('62000000-0000-0000-0005-000000000028','W28','W28','jeans','unisex','INT','Талия 71 см',28),
('62000000-0000-0000-0005-000000000029','W29','W29','jeans','unisex','INT','Талия 74 см',29),
('62000000-0000-0000-0005-000000000030','W30','W30','jeans','unisex','INT','Талия 76 см',30),
('62000000-0000-0000-0005-000000000031','W31','W31','jeans','unisex','INT','Талия 79 см',31),
('62000000-0000-0000-0005-000000000032','W32','W32','jeans','unisex','INT','Талия 81 см',32),
('62000000-0000-0000-0005-000000000033','W33','W33','jeans','unisex','INT','Талия 84 см',33),
('62000000-0000-0000-0005-000000000034','W34','W34','jeans','unisex','INT','Талия 86 см',34),
('62000000-0000-0000-0005-000000000036','W36','W36','jeans','unisex','INT','Талия 91 см',36),
('62000000-0000-0000-0005-000000000038','W38','W38','jeans','unisex','INT','Талия 97 см',38),
('62000000-0000-0000-0005-000000000040','W40','W40','jeans','unisex','INT','Талия 102 см',40),
('62000000-0000-0000-0005-000000000042','W42','W42','jeans','unisex','INT','Талия 107 см',42),
-- belts and headwear
('62000000-0000-0000-0006-000000000075','75','75','belt','unisex','CM','Ремень: длина 75 см',75),
('62000000-0000-0000-0006-000000000080','80','80','belt','unisex','CM','Ремень: длина 80 см',80),
('62000000-0000-0000-0006-000000000085','85','85','belt','unisex','CM','Ремень: длина 85 см',85),
('62000000-0000-0000-0006-000000000090','90','90','belt','unisex','CM','Ремень: длина 90 см',90),
('62000000-0000-0000-0006-000000000095','95','95','belt','unisex','CM','Ремень: длина 95 см',95),
('62000000-0000-0000-0006-000000000100','100','100','belt','unisex','CM','Ремень: длина 100 см',100),
('62000000-0000-0000-0006-000000000105','105','105','belt','unisex','CM','Ремень: длина 105 см',105),
('62000000-0000-0000-0006-000000000110','110','110','belt','unisex','CM','Ремень: длина 110 см',110),
('62000000-0000-0000-0007-000000000054','54','54','headwear','unisex','CM','Головные уборы: обхват 54 см',54),
('62000000-0000-0000-0007-000000000056','56','56','headwear','unisex','CM','Головные уборы: обхват 56 см',56),
('62000000-0000-0000-0007-000000000058','58','58','headwear','unisex','CM','Головные уборы: обхват 58 см',58),
('62000000-0000-0000-0007-000000000060','60','60','headwear','unisex','CM','Головные уборы: обхват 60 см',60),
-- footwear
('62000000-0000-0000-0008-000000000035','35','35','shoes','women','EU','Обувь: европейский размер 35',35),
('62000000-0000-0000-0008-000000000036','36','36','shoes','women','EU','Обувь: европейский размер 36',36),
('62000000-0000-0000-0008-000000000037','37','37','shoes','women','EU','Обувь: европейский размер 37',37),
('62000000-0000-0000-0008-000000000038','38','38','shoes','unisex','EU','Обувь: европейский размер 38',38),
('62000000-0000-0000-0008-000000000039','39','39','shoes','unisex','EU','Обувь: европейский размер 39',39),
('62000000-0000-0000-0008-000000000040','40','40','shoes','unisex','EU','Обувь: европейский размер 40',40),
('62000000-0000-0000-0008-000000000041','41','41','shoes','unisex','EU','Обувь: европейский размер 41',41),
('62000000-0000-0000-0008-000000000042','42','42','shoes','unisex','EU','Обувь: европейский размер 42',42),
('62000000-0000-0000-0008-000000000043','43','43','shoes','men','EU','Обувь: европейский размер 43',43),
('62000000-0000-0000-0008-000000000044','44','44','shoes','men','EU','Обувь: европейский размер 44',44),
('62000000-0000-0000-0008-000000000045','45','45','shoes','men','EU','Обувь: европейский размер 45',45),
('62000000-0000-0000-0008-000000000046','46','46','shoes','men','EU','Обувь: европейский размер 46',46)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,label=EXCLUDED.label,type=EXCLUDED.type,gender=EXCLUDED.gender,region=EXCLUDED.region,description=EXCLUDED.description,sort_order=EXCLUDED.sort_order;

-- Apply garment-specific grids to products that are already in the catalog.
WITH target AS (
  SELECT DISTINCT p.id FROM products p
  JOIN product_categories pc ON pc.product_id=p.id
  JOIN categories c ON c.id=pc.category_id
  WHERE LOWER(c.name) LIKE '%плать%'
), amounts AS (
  SELECT ps.product_id, GREATEST(1,ROUND(AVG(ps.quantity)))::int quantity FROM product_stock ps JOIN target t ON t.id=ps.product_id GROUP BY ps.product_id
), removed AS (
  DELETE FROM product_stock ps USING target t WHERE ps.product_id=t.id RETURNING ps.product_id
)
INSERT INTO product_stock(product_id,size_id,color_id,quantity)
SELECT t.id,s.id,pc.color_id,COALESCE(a.quantity,5) FROM target t
JOIN product_colors pc ON pc.product_id=t.id
JOIN sizes s ON s.type='women_dress'
LEFT JOIN amounts a ON a.product_id=t.id
ON CONFLICT DO NOTHING;

WITH target AS (
  SELECT DISTINCT p.id FROM products p
  JOIN product_categories pc ON pc.product_id=p.id
  JOIN categories c ON c.id=pc.category_id
  WHERE LOWER(c.name) LIKE '%джинс%'
), amounts AS (
  SELECT ps.product_id, GREATEST(1,ROUND(AVG(ps.quantity)))::int quantity FROM product_stock ps JOIN target t ON t.id=ps.product_id GROUP BY ps.product_id
), removed AS (
  DELETE FROM product_stock ps USING target t WHERE ps.product_id=t.id RETURNING ps.product_id
)
INSERT INTO product_stock(product_id,size_id,color_id,quantity)
SELECT t.id,s.id,pc.color_id,COALESCE(a.quantity,5) FROM target t
JOIN product_colors pc ON pc.product_id=t.id
JOIN sizes s ON s.type='jeans'
LEFT JOIN amounts a ON a.product_id=t.id
ON CONFLICT DO NOTHING;

WITH target AS (
  SELECT DISTINCT p.id,p.gender FROM products p
  JOIN product_categories pc ON pc.product_id=p.id
  JOIN categories c ON c.id=pc.category_id
  WHERE LOWER(c.name) LIKE '%брюк%'
), amounts AS (
  SELECT ps.product_id, GREATEST(1,ROUND(AVG(ps.quantity)))::int quantity FROM product_stock ps JOIN target t ON t.id=ps.product_id GROUP BY ps.product_id
), removed AS (
  DELETE FROM product_stock ps USING target t WHERE ps.product_id=t.id RETURNING ps.product_id
)
INSERT INTO product_stock(product_id,size_id,color_id,quantity)
SELECT t.id,s.id,pc.color_id,COALESCE(a.quantity,5) FROM target t
JOIN product_colors pc ON pc.product_id=t.id
JOIN sizes s ON s.type=CASE WHEN t.gender='MEN' THEN 'men_trousers' ELSE 'women_trousers' END
LEFT JOIN amounts a ON a.product_id=t.id
ON CONFLICT DO NOTHING;

-- Extend the primary clothing grids as well.
INSERT INTO sizes(id,name,label,type,gender,region,description,sort_order) VALUES
('31000000-0000-0000-0000-000000000006','50','50','women_clothing','women','RU','Обхват груди 98–102 см',50),
('31000000-0000-0000-0000-000000000007','52','52','women_clothing','women','RU','Обхват груди 102–106 см',52),
('31000000-0000-0000-0000-000000000008','54','54','women_clothing','women','RU','Обхват груди 106–110 см',54),
('31000000-0000-0000-0000-000000000009','56','56','women_clothing','women','RU','Обхват груди 110–114 см',56),
('32000000-0000-0000-0000-000000000007','58','58','men_clothing','men','RU','Обхват груди 114–118 см',58),
('32000000-0000-0000-0000-000000000008','60','60','men_clothing','men','RU','Обхват груди 118–122 см',60),
('32000000-0000-0000-0000-000000000009','62','62','men_clothing','men','RU','Обхват груди 122–126 см',62),
('32000000-0000-0000-0000-000000000010','64','64','men_clothing','men','RU','Обхват груди 126–130 см',64)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,label=EXCLUDED.label,type=EXCLUDED.type,gender=EXCLUDED.gender,region=EXCLUDED.region,description=EXCLUDED.description,sort_order=EXCLUDED.sort_order;
