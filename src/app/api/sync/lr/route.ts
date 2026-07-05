import { NextResponse } from 'next/server';
import hosxpDb from '@/lib/db/hosxp';
import localDb from '@/lib/db/local';
import iconv from 'iconv-lite';
import { getSqlQuery } from '@/lib/utils/sql-reader';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Query Data from HOSxP
    const query = getSqlQuery('sync_lr');

    const [rows]: any = await hosxpDb.query(query);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ message: 'No LR data found in HOSxP', synced: 0 }, { status: 200 });
    }

    // 2. Sync (Upsert) to local db_opoh
    let syncedCount = 0;
    
    // Clear old data first to avoid stale hospitals
    await localDb.query('DELETE FROM lr_management_summary');

    const getBangkokTime = () => {
      const d = new Date();
      const bangkokTime = new Date(d.getTime() + (7 * 60 * 60 * 1000));
      return bangkokTime.toISOString().replace('T', ' ').replace('Z', '');
    };
    const nowStr = getBangkokTime();

    for (const row of rows) {
      const {
        hospcode,
        hospital_name: raw_hospital_name,
        waiting_labor,
        normal_delivery,
        cesarean_delivery,
        abortion,
        not_delivery,
        total_case
      } = row;

      let hospital_name = '';
      if (raw_hospital_name) {
        hospital_name = iconv.decode(Buffer.from(raw_hospital_name, 'hex'), 'tis620');
      }

      const finalHospcode = hospcode === 'UNKNOWN' ? 'ไม่ระบุ' : hospcode;
      const finalHospitalName = hospital_name ? hospital_name : 'ไม่ระบุสถานบริการ';

      const upsertQuery = `
        INSERT INTO lr_management_summary 
        (hospital_code, hospital_name, waiting_labor, normal_delivery, cesarean_delivery, abortion, not_delivery, total_case, last_sync_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        hospital_name = VALUES(hospital_name),
        waiting_labor = VALUES(waiting_labor),
        normal_delivery = VALUES(normal_delivery),
        cesarean_delivery = VALUES(cesarean_delivery),
        abortion = VALUES(abortion),
        not_delivery = VALUES(not_delivery),
        total_case = VALUES(total_case),
        last_sync_at = VALUES(last_sync_at);
      `;

      await localDb.query(upsertQuery, [
        finalHospcode,
        finalHospitalName,
        Number(waiting_labor) || 0,
        Number(normal_delivery) || 0,
        Number(cesarean_delivery) || 0,
        Number(abortion) || 0,
        Number(not_delivery) || 0,
        Number(total_case) || 0,
        nowStr
      ]);
      
      syncedCount++;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'LR Sync completed successfully',
      total_synced: syncedCount
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error syncing LR data:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to sync LR data', 
      error: error.message 
    }, { status: 500 });
  }
}
