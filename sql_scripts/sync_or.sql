SELECT
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
WHERE request_operation_date = CURDATE();
