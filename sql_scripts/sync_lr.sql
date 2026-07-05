SELECT
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

ORDER BY x.total_case DESC;
