-- The local network blocks direct image-CDN requests. wsrv.nl provides a cached,
-- resized WebP response, so cards remain fast and their images actually render.
WITH direct_photos AS (
  SELECT ARRAY[
    'photo-1602293589930-45aad59ba3ab','photo-1637069585336-827b298fe84a','photo-1542272604-787c3835535d','photo-1475178626620-a4d074967452','photo-1714143136372-ddaf8b606da7','photo-1565084888279-aca607ecce0c','photo-1541099649105-f69ad21f3246','photo-1576995853123-5a10305d93c0','photo-1721637286605-ae9be19d681f','photo-1605518216938-7c31b7b14ad0','photo-1714143136367-7bb68f3f0669','photo-1715758890151-2c15d5d482aa','photo-1560243563-062bfc001d68','photo-1616956455145-7c40e34a1c2a',
    'photo-1541101767792-f9b2b1c4f127','photo-1609883475215-029a8d12426a','photo-1764337593519-c51a77b4fc3d','photo-1635650804247-8efb9b39f735','photo-1546578623-d1d3af878403','photo-1693930948232-94b6ee4b33ab','photo-1651496918126-cce288efa33f','photo-1693930882259-8ea6fd53fe23','photo-1604182440345-4a82e1c3876b','photo-1693930786016-de88b29bde7b','photo-1635650805023-f2529440b5aa','photo-1651496794070-bd6c4ab85228','photo-1635650804512-003e5ee6ccac','photo-1693930806094-0fe111315163','photo-1635650804284-19c8fc6bce04',
    'photo-1483985988355-763728e1935b','photo-1532453288672-3a27e9be9efd','photo-1753192104240-209f3fb568ef','photo-1753192108606-b4a2bc9e5661','photo-1614098097306-c67b8020c04e','photo-1445205170230-053b83016050','photo-1578681994506-b8f463449011','photo-1557303696-f0a415dc1b3e','photo-1542219550-2da790bf52e9','photo-1679847628912-4c3e7402abc7','photo-1605733513597-a8f8341084e6','photo-1594223274512-ad4803739b7c','photo-1597633125184-9fd7e54f0ff7','photo-1691480250099-a63081ecfcb8','photo-1592343516109-362f7bd871aa','photo-1751158723290-4d5b90e374aa','photo-1617922001439-4a2e6562f328','photo-1554412933-514a83d2f3c8','photo-1590330297626-d7aff25a0431','photo-1618244972963-dbee1a7edc95','photo-1612423284934-2850a4ea6b0f','photo-1731911656286-92bf1ebc87f3','photo-1616847220575-31b062a4cd05'
  ]::text[] AS photos
), targets AS (SELECT generate_series(1,110) AS n)
UPDATE images i SET url=
  'https://wsrv.nl/?url=images.unsplash.com/' || direct_photos.photos[1 + ((targets.n - 1) % array_length(direct_photos.photos,1))]
  || '&w=900&h=1200&fit=cover&output=webp&q=82'
  || CASE WHEN targets.n > array_length(direct_photos.photos,1) THEN '&flip' ELSE '' END
FROM targets, direct_photos
WHERE i.id=('52000000-0000-0000-0000-' || LPAD(targets.n::text,12,'0'))::uuid;
