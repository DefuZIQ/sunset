WITH targets AS (SELECT generate_series(1,110) AS n)
UPDATE images i
SET url=i.url || '&v=' || targets.n::text
  || CASE WHEN targets.n > 104 THEN '&ro=' || ((targets.n - 104) * 2)::text ELSE '' END
FROM targets
WHERE i.id=('52000000-0000-0000-0000-' || LPAD(targets.n::text,12,'0'))::uuid;
