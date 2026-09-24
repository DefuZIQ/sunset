-- Third-level catalog categories. Products are assigned only to terminal nodes;
-- the API expands the parent path for display and filtering.
INSERT INTO categories(id,name,parent_id) VALUES
('13000000-0000-0000-0000-000000000001','Женские куртки','10000000-0000-0000-0000-000000000007'),
('13000000-0000-0000-0000-000000000002','Женские пальто','10000000-0000-0000-0000-000000000007'),
('13000000-0000-0000-0000-000000000003','Женские тренчи','10000000-0000-0000-0000-000000000007'),
('13000000-0000-0000-0000-000000000004','Женские сумки','10000000-0000-0000-0000-000000000006'),
('13000000-0000-0000-0000-000000000005','Женские ремни','10000000-0000-0000-0000-000000000006'),
('13000000-0000-0000-0000-000000000006','Женские головные уборы','10000000-0000-0000-0000-000000000006'),
('13000000-0000-0000-0000-000000000101','Мужские куртки','10000000-0000-0000-0000-000000000206'),
('13000000-0000-0000-0000-000000000102','Мужские пальто','10000000-0000-0000-0000-000000000206'),
('13000000-0000-0000-0000-000000000103','Мужские парки','10000000-0000-0000-0000-000000000206')
ON CONFLICT (name) DO UPDATE SET parent_id=EXCLUDED.parent_id;

-- Move current merchandise from broad categories to the appropriate leaves.
UPDATE product_categories pc SET category_id='13000000-0000-0000-0000-000000000003'
FROM products p
WHERE pc.product_id=p.id
  AND pc.category_id='10000000-0000-0000-0000-000000000007'
  AND LOWER(p.name) LIKE '%тренч%';

UPDATE product_categories pc SET category_id='13000000-0000-0000-0000-000000000001'
FROM products p
WHERE pc.product_id=p.id
  AND pc.category_id='10000000-0000-0000-0000-000000000007'
  AND LOWER(p.name) LIKE '%куртк%';

UPDATE product_categories pc SET category_id='13000000-0000-0000-0000-000000000004'
FROM products p
WHERE pc.product_id=p.id
  AND pc.category_id='10000000-0000-0000-0000-000000000006'
  AND LOWER(p.name) LIKE '%сумк%';

UPDATE product_categories pc SET category_id='13000000-0000-0000-0000-000000000101'
FROM products p
WHERE pc.product_id=p.id
  AND pc.category_id='10000000-0000-0000-0000-000000000206'
  AND LOWER(p.name) LIKE '%куртк%';
