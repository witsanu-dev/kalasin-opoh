import { NextResponse } from 'next/server';
import hosxpDb from '@/lib/db/hosxp';
import localDb from '@/lib/db/local';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Query Data from HOSxP for Current Date
    const query = `
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
    `;

    const [rows]: any = await hosxpDb.query(query);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ message: 'No data found in HOSxP', synced: 0 }, { status: 200 });
    }

    const {
      room_available,
      operating_count,
      waiting_count,
      completed_count,
      cancelled_count,
      total_case_today
    } = rows[0];

    // Read hospital info from env
    const hospitalCode = process.env.NEXT_PUBLIC_HOSPITAL_CODE || '00000';
    const hospitalName = process.env.NEXT_PUBLIC_HOSPITAL_FULL_NAME || 'Unknown Hospital';

    const getBangkokTime = () => {
      const d = new Date();
      const bangkokTime = new Date(d.getTime() + (7 * 60 * 60 * 1000));
      return bangkokTime.toISOString().replace('T', ' ').replace('Z', '');
    };
    const nowStr = getBangkokTime();

    // 2. Sync (Upsert) to local db_opoh
    const upsertQuery = `
      INSERT INTO or_management_summary 
      (hospital_code, hospital_name, room_available_str, operating_count, waiting_count, completed_count, cancelled_count, total_case_today, last_sync_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      hospital_name = VALUES(hospital_name),
      room_available_str = VALUES(room_available_str),
      operating_count = VALUES(operating_count),
      waiting_count = VALUES(waiting_count),
      completed_count = VALUES(completed_count),
      cancelled_count = VALUES(cancelled_count),
      total_case_today = VALUES(total_case_today),
      last_sync_at = VALUES(last_sync_at);
    `;

    await localDb.query(upsertQuery, [
      hospitalCode,
      hospitalName,
      room_available || '0/0',
      Number(operating_count) || 0,
      Number(waiting_count) || 0,
      Number(completed_count) || 0,
      Number(cancelled_count) || 0,
      Number(total_case_today) || 0,
      nowStr
    ]);

    return NextResponse.json({ 
      success: true, 
      message: 'Sync completed successfully'
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error syncing OR data:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to sync data', 
      error: error.message 
    }, { status: 500 });
  }
}
