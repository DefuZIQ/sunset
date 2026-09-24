-- Gendered catalog branches, product-aware size grids, and category-matched photos.
ALTER TABLE products ADD COLUMN IF NOT EXISTS gender VARCHAR(20) NOT NULL DEFAULT 'WOMEN';
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_gender_check;
ALTER TABLE products ADD CONSTRAINT products_gender_check CHECK (gender IN ('WOMEN', 'MEN', 'UNISEX'));
CREATE INDEX IF NOT EXISTS idx_products_gender ON products(gender);

-- Keep category names unique because the public API currently exposes their names.
UPDATE categories SET name='Для женщин' WHERE id='10000000-0000-0000-0000-000000000100';
UPDATE categories SET name='Женские боди' WHERE id='10000000-0000-0000-0000-000000000001';
UPDATE categories SET name='Женские пиджаки' WHERE id='10000000-0000-0000-0000-000000000002';
UPDATE categories SET name='Женские платья' WHERE id='10000000-0000-0000-0000-000000000003';
UPDATE categories SET name='Женские джинсы' WHERE id='10000000-0000-0000-0000-000000000004';
UPDATE categories SET name='Женские кофты' WHERE id='10000000-0000-0000-0000-000000000005';
UPDATE categories SET name='Женские аксессуары', parent_id='10000000-0000-0000-0000-000000000100' WHERE id='10000000-0000-0000-0000-000000000006';
UPDATE categories SET name='Женская верхняя одежда' WHERE id='10000000-0000-0000-0000-000000000007';

INSERT INTO categories(id,name,parent_id) VALUES
('10000000-0000-0000-0000-000000000200','Для мужчин',NULL),
('10000000-0000-0000-0000-000000000201','Мужские футболки','10000000-0000-0000-0000-000000000200'),
('10000000-0000-0000-0000-000000000202','Мужские рубашки','10000000-0000-0000-0000-000000000200'),
('10000000-0000-0000-0000-000000000203','Мужские брюки','10000000-0000-0000-0000-000000000200'),
('10000000-0000-0000-0000-000000000204','Мужские джинсы','10000000-0000-0000-0000-000000000200'),
('10000000-0000-0000-0000-000000000205','Мужские пиджаки','10000000-0000-0000-0000-000000000200'),
('10000000-0000-0000-0000-000000000206','Мужская верхняя одежда','10000000-0000-0000-0000-000000000200'),
('10000000-0000-0000-0000-000000000207','Мужские худи','10000000-0000-0000-0000-000000000200')
ON CONFLICT (name) DO UPDATE SET parent_id=EXCLUDED.parent_id;

INSERT INTO sizes(id,name,label,type,gender,region,description,sort_order) VALUES
('31000000-0000-0000-0000-000000000001','40','40','women_clothing','women','RU','Обхват груди 78–82 см',40),
('31000000-0000-0000-0000-000000000002','42','42','women_clothing','women','RU','Обхват груди 82–86 см',42),
('31000000-0000-0000-0000-000000000003','44','44','women_clothing','women','RU','Обхват груди 86–90 см',44),
('31000000-0000-0000-0000-000000000004','46','46','women_clothing','women','RU','Обхват груди 90–94 см',46),
('31000000-0000-0000-0000-000000000005','48','48','women_clothing','women','RU','Обхват груди 94–98 см',48),
('32000000-0000-0000-0000-000000000001','46','46','men_clothing','men','RU','Обхват груди 90–94 см',46),
('32000000-0000-0000-0000-000000000002','48','48','men_clothing','men','RU','Обхват груди 94–98 см',48),
('32000000-0000-0000-0000-000000000003','50','50','men_clothing','men','RU','Обхват груди 98–102 см',50),
('32000000-0000-0000-0000-000000000004','52','52','men_clothing','men','RU','Обхват груди 102–106 см',52),
('32000000-0000-0000-0000-000000000005','54','54','men_clothing','men','RU','Обхват груди 106–110 см',54),
('32000000-0000-0000-0000-000000000006','56','56','men_clothing','men','RU','Обхват груди 110–114 см',56),
('33000000-0000-0000-0000-000000000001','W28','W28','waist','unisex','INT','Талия 71 см',28),
('33000000-0000-0000-0000-000000000002','W30','W30','waist','unisex','INT','Талия 76 см',30),
('33000000-0000-0000-0000-000000000003','W32','W32','waist','unisex','INT','Талия 81 см',32),
('33000000-0000-0000-0000-000000000004','W34','W34','waist','unisex','INT','Талия 86 см',34),
('33000000-0000-0000-0000-000000000005','W36','W36','waist','unisex','INT','Талия 91 см',36),
('33000000-0000-0000-0000-000000000006','W38','W38','waist','unisex','INT','Талия 96 см',38),
('34000000-0000-0000-0000-000000000001','ONE SIZE','ONE SIZE','accessory','unisex','INT','Универсальный размер',1)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,label=EXCLUDED.label,type=EXCLUDED.type,gender=EXCLUDED.gender,region=EXCLUDED.region,description=EXCLUDED.description,sort_order=EXCLUDED.sort_order;

-- The first ten curated products keep their original photos, but receive correct gender/size data.
UPDATE products SET gender=CASE WHEN id IN ('40000000-0000-0000-0000-000000000006','40000000-0000-0000-0000-000000000007','40000000-0000-0000-0000-000000000008','40000000-0000-0000-0000-000000000010') THEN 'UNISEX' ELSE 'WOMEN' END
WHERE id::text LIKE '40000000-%';

-- Split the generated collection evenly into women and men and use relevant garment names.
UPDATE products p SET
  gender=CASE WHEN n<=55 THEN 'WOMEN' ELSE 'MEN' END,
  name=CASE WHEN n<=55 THEN
    (ARRAY['Боди','Пиджак','Платье','Джинсы','Кардиган','Сумка','Тренч'])[1+((n-1)%7)]
    ELSE (ARRAY['Футболка','Рубашка','Брюки','Джинсы','Пиджак','Куртка','Худи'])[1+((n-56)%7)] END
    || ' ' || (ARRAY['AURA','MUSE','NOVA','LINE','WAVE','SOFT','ICON','PURE'])[1+((n-1)%8)] || ' ' || LPAD(n::text,3,'0'),
  description=CASE WHEN n<=55 THEN 'Женская модель SUNSET: современный силуэт, комфортная посадка и тщательно подобранные материалы.' ELSE 'Мужская модель SUNSET: продуманный крой, комфортная посадка и износостойкие материалы.' END,
  updated_at=NOW()
FROM (SELECT generate_series(1,110) n) s
WHERE p.id=('41000000-0000-0000-0000-'||LPAD(s.n::text,12,'0'))::uuid;

DELETE FROM product_categories WHERE product_id::text LIKE '41000000-%';
INSERT INTO product_categories(product_id,category_id)
SELECT ('41000000-0000-0000-0000-'||LPAD(n::text,12,'0'))::uuid,
  CASE WHEN n<=55 THEN ('10000000-0000-0000-0000-'||LPAD((1+((n-1)%7))::text,12,'0'))::uuid
       ELSE ('10000000-0000-0000-0000-'||LPAD((201+((n-56)%7))::text,12,'0'))::uuid END
FROM generate_series(1,110) n;

-- Rebuild stock so each garment exposes only its appropriate grid.
DELETE FROM product_stock WHERE product_id::text LIKE '40000000-%' OR product_id::text LIKE '41000000-%';

INSERT INTO product_stock(product_id,size_id,color_id,quantity)
SELECT p.id,s.id,pc.color_id,4+((ROW_NUMBER() OVER())::int%9)
FROM products p JOIN product_colors pc ON pc.product_id=p.id
JOIN sizes s ON s.type=CASE
  WHEN p.id IN ('40000000-0000-0000-0000-000000000006','40000000-0000-0000-0000-000000000007','40000000-0000-0000-0000-000000000008','40000000-0000-0000-0000-000000000010') THEN 'accessory'
  WHEN p.id='40000000-0000-0000-0000-000000000005' THEN 'waist'
  ELSE 'women_clothing' END
WHERE p.id::text LIKE '40000000-%';

INSERT INTO product_stock(product_id,size_id,color_id,quantity)
SELECT p.id,s.id,pc.color_id,3+((n+s.sort_order)%14)
FROM generate_series(1,110) n
JOIN products p ON p.id=('41000000-0000-0000-0000-'||LPAD(n::text,12,'0'))::uuid
JOIN product_colors pc ON pc.product_id=p.id
JOIN sizes s ON s.type=CASE
  WHEN n<=55 AND ((n-1)%7)=5 THEN 'accessory'
  WHEN (n<=55 AND ((n-1)%7)=3) OR (n>55 AND ((n-56)%7) IN (2,3)) THEN 'waist'
  WHEN n<=55 THEN 'women_clothing'
  ELSE 'men_clothing' END;

-- LoremFlickr provides a stable, unique photo for each lock and search tuple.
-- wsrv keeps the image fast and reachable from the storefront network.
UPDATE images i SET url='https://wsrv.nl/?url=' ||
  CASE WHEN n<=55 THEN
    (ARRAY['loremflickr.com/900/1200/woman,bodysuit,fashion','loremflickr.com/900/1200/woman,blazer,fashion','loremflickr.com/900/1200/woman,dress,fashion','loremflickr.com/900/1200/woman,jeans,fashion','loremflickr.com/900/1200/woman,cardigan,fashion','loremflickr.com/900/1200/handbag,fashion','loremflickr.com/900/1200/woman,trenchcoat,fashion'])[1+((n-1)%7)]
  ELSE
    (ARRAY['loremflickr.com/900/1200/man,tshirt,fashion','loremflickr.com/900/1200/man,shirt,fashion','loremflickr.com/900/1200/man,trousers,fashion','loremflickr.com/900/1200/man,jeans,fashion','loremflickr.com/900/1200/man,blazer,fashion','loremflickr.com/900/1200/man,jacket,fashion','loremflickr.com/900/1200/man,hoodie,fashion'])[1+((n-56)%7)] END
  || '%3Flock%3D' || (700+n)::text || '&w=900&h=1200&fit=cover&output=webp&q=82', updated_at=NOW()
FROM generate_series(1,110) n
WHERE i.id=('52000000-0000-0000-0000-'||LPAD(n::text,12,'0'))::uuid;
