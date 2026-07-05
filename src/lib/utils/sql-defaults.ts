export const DEFAULT_SQL_TEMPLATES: Record<string, string> = {
  sync_beds: `SELECT
    w.ward,
    w.name AS ward_name,
    COUNT(DISTINCT b.bedno) AS total_bed,
    COUNT(DISTINCT CASE WHEN i.dchdate IS NULL THEN ia.bedno END) AS occupied_bed,
    COUNT(DISTINCT b.bedno) - COUNT(DISTINCT CASE WHEN i.dchdate IS NULL THEN ia.bedno END) AS available_bed,
    ROUND(COUNT(DISTINCT CASE WHEN i.dchdate IS NULL THEN ia.bedno END) * 100 / NULLIF(COUNT(DISTINCT b.bedno),0), 2) AS occupancy_rate,
    MAX(b.export_code) AS export_code,
    -- ระบุเงื่อนไขตึก ICU ของคุณที่นี่ เช่น CASE WHEN w.name LIKE '%ICU%' THEN 1 ELSE 0 END
    0 AS is_icu
FROM bedno b
LEFT JOIN roomno r ON r.roomno = b.roomno
LEFT JOIN ward w ON w.ward = r.ward
LEFT JOIN iptadm ia ON ia.bedno = b.bedno
LEFT JOIN ipt i ON i.an = ia.an
WHERE w.ward_active = 'Y' AND b.export_code IS NOT NULL
GROUP BY w.ward,w.name
ORDER BY w.name;`,

  sync_lr: `SELECT
    x.hospcode,
    HEX(h.Dhospital) AS hospital_name,
    x.waiting_labor,
    x.normal_delivery,
    x.cesarean_delivery,
    x.abortion,
    x.not_delivery,
    x.total_case
FROM
(
    SELECT
        CASE
            WHEN pa.labour_hospcode REGEXP '[0-9]{5}$'
            THEN RIGHT(pa.labour_hospcode,5)
            ELSE 'UNKNOWN'
        END AS hospcode,

        SUM(CASE
                WHEN pa.labor_status_id = 1
                 AND pa.discharge = 'N'
                THEN 1 ELSE 0
            END) AS waiting_labor,

        SUM(CASE
                WHEN pa.labor_status_id = 2
                 AND pa.labour_type_id = 1
                 AND pa.labor_date BETWEEN CONCAT(YEAR(CURDATE()) - IF(MONTH(CURDATE()) >= 10, 0, 1), '-10-01') AND CURDATE()
                THEN 1 ELSE 0
            END) AS normal_delivery,

        SUM(CASE
                WHEN pa.labor_status_id = 2
                 AND pa.labour_type_id = 2
                 AND pa.labor_date BETWEEN CONCAT(YEAR(CURDATE()) - IF(MONTH(CURDATE()) >= 10, 0, 1), '-10-01') AND CURDATE()
                THEN 1 ELSE 0
            END) AS cesarean_delivery,

        SUM(CASE
                WHEN pa.labor_status_id = 3
                 AND pa.labor_date BETWEEN CONCAT(YEAR(CURDATE()) - IF(MONTH(CURDATE()) >= 10, 0, 1), '-10-01') AND CURDATE()
                THEN 1 ELSE 0
            END) AS abortion,

        SUM(CASE
                WHEN pa.labor_status_id = 4
                 AND pa.labor_date BETWEEN CONCAT(YEAR(CURDATE()) - IF(MONTH(CURDATE()) >= 10, 0, 1), '-10-01') AND CURDATE()
                THEN 1 ELSE 0
            END) AS not_delivery,

        SUM(CASE
                WHEN pa.labor_status_id = 1
                 AND pa.discharge = 'N'
                THEN 1 ELSE 0
            END)
        +
        SUM(CASE
                WHEN pa.labor_status_id IN (2,3,4)
                 AND pa.labor_date BETWEEN CONCAT(YEAR(CURDATE()) - IF(MONTH(CURDATE()) >= 10, 0, 1), '-10-01') AND CURDATE()
                THEN 1 ELSE 0
            END) AS total_case

    FROM person_anc pa

    GROUP BY
        CASE
            WHEN pa.labour_hospcode REGEXP '[0-9]{5}$'
            THEN RIGHT(pa.labour_hospcode,5)
            ELSE 'UNKNOWN'
        END
) x

LEFT JOIN dbhospital h
       ON h.idhospital = x.hospcode

WHERE x.total_case > 0

ORDER BY x.total_case DESC;`,

  sync_or: `SELECT
    CONCAT(
        (
            SELECT COUNT(*) - COUNT(DISTINCT o.room_id)
            FROM operation_room r
            LEFT JOIN operation_list o
                ON o.room_id = r.room_id
                AND o.request_operation_date = CURDATE()
                AND o.status_id = 2
        ),
        '/',
        (SELECT COUNT(*) FROM operation_room)
    ) AS room_available,
    SUM(CASE WHEN status_id = 2 THEN 1 ELSE 0 END) AS operating_count,
    SUM(CASE WHEN status_id = 1 THEN 1 ELSE 0 END) AS waiting_count,
    SUM(CASE WHEN status_id = 3 THEN 1 ELSE 0 END) AS completed_count,
    SUM(CASE WHEN status_id = 9 THEN 1 ELSE 0 END) AS cancelled_count,
    COUNT(*) AS total_case_today
FROM operation_list
WHERE request_operation_date = CURDATE();`
};
