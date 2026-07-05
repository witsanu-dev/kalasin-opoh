SELECT
    w.ward,
    w.name AS ward_name,
    COUNT(DISTINCT b.bedno) AS total_bed,
    COUNT(DISTINCT CASE WHEN i.dchdate IS NULL THEN ia.bedno END) AS occupied_bed,
    COUNT(DISTINCT b.bedno) - COUNT(DISTINCT CASE WHEN i.dchdate IS NULL THEN ia.bedno END) AS available_bed,
    ROUND(COUNT(DISTINCT CASE WHEN i.dchdate IS NULL THEN ia.bedno END) * 100 / NULLIF(COUNT(DISTINCT b.bedno),0), 2) AS occupancy_rate,
    MAX(b.export_code) AS export_code,
    CASE WHEN w.name LIKE '%ICU%' THEN 1 ELSE 0 END AS is_icu
FROM bedno b
LEFT JOIN roomno r ON r.roomno = b.roomno
LEFT JOIN ward w ON w.ward = r.ward
LEFT JOIN iptadm ia ON ia.bedno = b.bedno
LEFT JOIN ipt i ON i.an = ia.an
WHERE w.ward_active = 'Y' AND b.export_code IS NOT NULL
GROUP BY w.ward,w.name
ORDER BY w.name;