import { NextResponse } from 'next/server';
import hosxpDb from '@/lib/db/hosxp';
import localDb from '@/lib/db/local';
import { getSqlQuery } from '@/lib/utils/sql-reader';

export const dynamic = 'force-dynamic'; // Always run fresh

export async function POST(request: Request) {
  try {
    // 1. Query Data from HOSxP
    const query = getSqlQuery('sync_beds');

    const [rows]: any = await hosxpDb.query(query);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ message: 'No data found in HOSxP', synced: 0 }, { status: 200 });
    }

    // 2. Sync (Upsert) to local db_opoh
    let syncedCount = 0;
    
    const getBangkokTime = () => {
      const d = new Date();
      const bangkokTime = new Date(d.getTime() + (7 * 60 * 60 * 1000));
      return bangkokTime.toISOString().replace('T', ' ').replace('Z', '');
    };
    const nowStr = getBangkokTime();
    const hospitalCode = process.env.NEXT_PUBLIC_HOSPITAL_CODE || '11078';

    // Remove stale wards that might have an old or empty hospital_code
    await localDb.query('DELETE FROM bed_management_summary WHERE hospital_code != ?', [hospitalCode]);

    for (const row of rows) {
      const {
        ward,
        ward_name,
        total_bed,
        occupied_bed,
        available_bed,
        occupancy_rate,
        export_code,
        is_icu
      } = row;

      const upsertQuery = `
        INSERT INTO bed_management_summary 
        (hospital_code, ward_code, ward_name, total_bed, occupied_bed, available_bed, occupancy_rate, export_code, is_icu, last_sync_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        hospital_code = VALUES(hospital_code),
        ward_name = VALUES(ward_name),
        total_bed = VALUES(total_bed),
        occupied_bed = VALUES(occupied_bed),
        available_bed = VALUES(available_bed),
        occupancy_rate = VALUES(occupancy_rate),
        export_code = VALUES(export_code),
        is_icu = VALUES(is_icu),
        last_sync_at = VALUES(last_sync_at);
      `;

      await localDb.query(upsertQuery, [
        hospitalCode,
        ward,
        ward_name,
        total_bed,
        occupied_bed,
        available_bed,
        occupancy_rate,
        export_code,
        Number(is_icu) || 0,
        nowStr
      ]);

      syncedCount++;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Sync completed successfully',
      total_synced: syncedCount 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error syncing beds:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to sync data', 
      error: error.message 
    }, { status: 500 });
  }
}
