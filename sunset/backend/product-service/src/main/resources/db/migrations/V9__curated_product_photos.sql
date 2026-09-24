-- Replace broad keyword results with manually reviewed, garment-specific Pexels series.
WITH catalog_photo_ids AS (
  SELECT n, CASE
    -- women: bodysuits, blazers, dresses, jeans, cardigans, bags, trench coats
    WHEN n<=55 AND ((n-1)%7)=0 THEN (ARRAY[10693913,15370119,15369512,8187597])[1+((n-1)/7)%4]
    WHEN n<=55 AND ((n-1)%7)=1 THEN (ARRAY[11506072,13064308,7959789])[1+((n-1)/7)%3]
    WHEN n<=55 AND ((n-1)%7)=2 THEN (ARRAY[5885840,10208109,1755428,2065195])[1+((n-1)/7)%4]
    WHEN n<=55 AND ((n-1)%7)=3 THEN (ARRAY[14956269,15585439,994523])[1+((n-1)/7)%3]
    WHEN n<=55 AND ((n-1)%7)=4 THEN (ARRAY[6812213,14170582,6634916])[1+((n-1)/7)%3]
    WHEN n<=55 AND ((n-1)%7)=5 THEN (ARRAY[12471934,8989866,1152077])[1+((n-1)/7)%3]
    WHEN n<=55 AND ((n-1)%7)=6 THEN (ARRAY[10355113,28297299,1183266])[1+((n-1)/7)%3]
    -- men: t-shirts, shirts, trousers, jeans, blazers, jackets, hoodies
    WHEN n>55 AND ((n-56)%7)=0 THEN (ARRAY[19437841,14428674,19048886,24289007,19881714,25312252])[1+((n-56)/7)%6]
    WHEN n>55 AND ((n-56)%7)=1 THEN (ARRAY[10814413,12181668,15451675,13127608,14777247,12987582,11797701])[1+((n-56)/7)%7]
    WHEN n>55 AND ((n-56)%7)=2 THEN (ARRAY[6311128,20110447,17924381])[1+((n-56)/7)%3]
    WHEN n>55 AND ((n-56)%7)=3 THEN (ARRAY[15637836,14897239,1040945])[1+((n-56)/7)%3]
    WHEN n>55 AND ((n-56)%7)=4 THEN (ARRAY[8276233,26761831,18070345])[1+((n-56)/7)%3]
    WHEN n>55 AND ((n-56)%7)=5 THEN (ARRAY[26964991,10559980,23363491,19565723,13973137,20451619,17340238])[1+((n-56)/7)%7]
    ELSE (ARRAY[12999972,3353471,1706912,14389777,2451578,1687318,2778171,7107998,12151056,3392034,1820658])[1+((n-56)/7)%11]
  END AS photo_id
  FROM generate_series(1,110) n
)
UPDATE images i SET
  url='https://wsrv.nl/?url=images.pexels.com/photos/' || p.photo_id || '/pexels-photo-' || p.photo_id || '.jpeg&w=900&h=1200&fit=cover&output=webp&q=84&v=' || p.n,
  updated_at=NOW()
FROM catalog_photo_ids p
WHERE i.id=('52000000-0000-0000-0000-'||LPAD(p.n::text,12,'0'))::uuid;
