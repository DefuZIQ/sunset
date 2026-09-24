-- Keep the original ten image files, while aligning their product data with what is visible in each photo.
INSERT INTO categories(id,name,parent_id) VALUES
('10000000-0000-0000-0000-000000000008','Женские костюмы','10000000-0000-0000-0000-000000000100'),
('10000000-0000-0000-0000-000000000009','Женские юбки','10000000-0000-0000-0000-000000000100')
ON CONFLICT (name) DO UPDATE SET parent_id=EXCLUDED.parent_id;

UPDATE products SET name='Боди BASE', gender='WOMEN', description='Белое женское боди с длинным рукавом и высокой горловиной.' WHERE id='40000000-0000-0000-0000-000000000001';
UPDATE products SET name='Костюм LILAC', gender='WOMEN', description='Женский брючный костюм нежного сиреневого оттенка.' WHERE id='40000000-0000-0000-0000-000000000002';
UPDATE products SET name='Боди WRAP', gender='WOMEN', description='Чёрное женское боди с запахом и длинным рукавом.' WHERE id='40000000-0000-0000-0000-000000000003';
UPDATE products SET name='Боди WHITE', gender='WOMEN', description='Белое женское боди с выразительной посадкой.' WHERE id='40000000-0000-0000-0000-000000000004';
UPDATE products SET name='Куртка URBAN', gender='WOMEN', description='Светлая женская куртка свободного городского кроя.' WHERE id='40000000-0000-0000-0000-000000000005';
UPDATE products SET name='Платье RETRO', gender='WOMEN', description='Женское платье с геометрическим принтом в тёплых оттенках.' WHERE id='40000000-0000-0000-0000-000000000006';
UPDATE products SET name='Пиджак IVORY', gender='WOMEN', description='Белый двубортный женский пиджак лаконичного кроя.' WHERE id='40000000-0000-0000-0000-000000000007';
UPDATE products SET name='Платье NUDE', gender='WOMEN', description='Приталенное женское платье нежного пудрового оттенка.' WHERE id='40000000-0000-0000-0000-000000000008';
UPDATE products SET name='Пиджак OVERSIZE', gender='WOMEN', description='Чёрный женский пиджак свободного силуэта.' WHERE id='40000000-0000-0000-0000-000000000009';
UPDATE products SET name='Юбка PLEATED', gender='WOMEN', description='Женская плиссированная юбка длины миди графитового оттенка.' WHERE id='40000000-0000-0000-0000-000000000010';

DELETE FROM product_categories WHERE product_id::text LIKE '40000000-%';
INSERT INTO product_categories(product_id,category_id) VALUES
('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000008'),
('40000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000007'),
('40000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000003'),
('40000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000002'),
('40000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000003'),
('40000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000002'),
('40000000-0000-0000-0000-000000000010','10000000-0000-0000-0000-000000000009');

DELETE FROM product_stock WHERE product_id::text LIKE '40000000-%';
INSERT INTO product_stock(product_id,size_id,color_id,quantity)
SELECT p.id,s.id,pc.color_id,8
FROM products p
JOIN product_colors pc ON pc.product_id=p.id
JOIN sizes s ON s.type='women_clothing'
WHERE p.id::text LIKE '40000000-%';
