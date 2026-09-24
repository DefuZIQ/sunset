-- The first ten original products are intentionally unchanged. Each of the 110
-- generated products receives a different, licensed Unsplash fashion photo.
WITH photo_tokens(token, n) AS (
  SELECT token, ordinality::int FROM unnest(ARRAY[
    'photo-1602293589930-45aad59ba3ab','photo-1637069585336-827b298fe84a','photo-1542272604-787c3835535d','photo-1475178626620-a4d074967452','photo-1714143136372-ddaf8b606da7','photo-1565084888279-aca607ecce0c','photo-1541099649105-f69ad21f3246','photo-1576995853123-5a10305d93c0','photo-1721637286605-ae9be19d681f','photo-1605518216938-7c31b7b14ad0','photo-1714143136367-7bb68f3f0669','photo-1715758890151-2c15d5d482aa','photo-1560243563-062bfc001d68','photo-1616956455145-7c40e34a1c2a',
    'cHLW0E2PrAc','cRpcTf0VfuE','HVHIVKAd0R0','t62612G-UtM','DPOPc2vhUww','OqQ2hmalqnU','_MrdhhuR26Q','SNJrKsy0U7s','qn0qN-CwDsU','6_LidIGnJqU','2ZXVU3BJzN4','mqQAwtYXd0s','Wsq6uLO1bbc','UbrPTBBxaE8','pDwrbuwTmSA',
    '7cERndkOyDw','ycVFts5Ma4s','-IlmDnJg5cg','JU5_bUxr5Rg','jlo7Bf4tUoY','jGXBpAKGkfI','AIE1_Kp5Zp4','dg0uHhW0Fd4','pYYSOBjg6CI','PQmXUxmfR44','o9dtfshlJ60','9cxiJMMUJZ4','NKjIT7u5nXE','A7f7XRKgUWc','mahjS9zuKRE',
    'tcVH_BwHtrc','D4jRahaUaIc','J4DnKxz_3sA','nvQemFKRBUo','lnbuoKz2GlM','ZB4eQcNqVUs','IwVRO3TLjLc','HY1fq4ZtLTE','W-7k72ThEr0','ScYGyGhA9HQ','MQOA0n3chA8','hjAkD8o2rmg','wGTO-1EuXYY','RycLeDdrWJ0','zxPo13geJ5U',
    'Uw3OfKz2J-0','HgyAIYvMWkw','RuBXafq461A','jXzyR6tgd18','-eb0moHDPBI','VsCBt8j-qg4','vS0Kya7E5V4','D381E7Lg2J4','G5RSe8i_Id8','JqRQtSr2MCI','ItqFmSxKnIg','SVMaSpddK7o','ikjvPfC3pbI','YAWSHBdjdO0','cYRsB4liZPs',
    'photo-1541101767792-f9b2b1c4f127','photo-1609883475215-029a8d12426a','photo-1764337593519-c51a77b4fc3d','photo-1635650804247-8efb9b39f735','photo-1546578623-d1d3af878403','photo-1693930948232-94b6ee4b33ab','photo-1651496918126-cce288efa33f','photo-1693930882259-8ea6fd53fe23','photo-1604182440345-4a82e1c3876b','photo-1693930786016-de88b29bde7b','photo-1635650805023-f2529440b5aa','photo-1651496794070-bd6c4ab85228','photo-1635650804512-003e5ee6ccac','photo-1693930806094-0fe111315163','photo-1635650804284-19c8fc6bce04',
    'oh6FswCTTmY','SuehLCmYYEE','xDUwFraNJbg','XmDZKCBFezg','o4urVfm6m_s','aglYgA9Cc6Y','fx6ahHGkKHw','Xyshdfb5eu8','IJzw3H5s4ps','Dw4UH40yeQU','UDMQ3RzLtGc','Vv9LC7cl0KQ','h0DjPOX2jMA','GdFDTNESEsA',
    'pIKQbdSzF_k','nyrSsBzhZ4Y','2UTk-Nip5aM','vj-_S20w04o','b1lyrH1DEUw','JqZlSnI2ctA','KP4bxnxAilU'
  ]::text[]) WITH ORDINALITY AS source(token, ordinality)
), photo_urls AS (
  SELECT n, CASE WHEN token LIKE 'photo-%'
    THEN 'https://images.unsplash.com/' || token || '?auto=format&fit=crop&w=900&h=1200&q=82'
    ELSE 'https://unsplash.com/photos/' || token || '/download?force=true&w=900'
  END AS url FROM photo_tokens
), upserted AS (
  INSERT INTO images(id, url)
  SELECT ('52000000-0000-0000-0000-' || LPAD(n::text,12,'0'))::uuid, url FROM photo_urls
  ON CONFLICT (id) DO UPDATE SET url=EXCLUDED.url RETURNING id
)
UPDATE product_images pi
SET image_id=('52000000-0000-0000-0000-' || LPAD(photo_urls.n::text,12,'0'))::uuid
FROM photo_urls
WHERE pi.product_id=('41000000-0000-0000-0000-' || LPAD(photo_urls.n::text,12,'0'))::uuid
  AND pi.type_image='front';
