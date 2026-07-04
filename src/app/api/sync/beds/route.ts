import { NextResponse } from 'next/server';
import hosxpDb from '@/lib/db/hosxp';
import localDb from '@/lib/db/local';

export const dynamic = 'force-dynamic'; // Always run fresh

export async function POST(request: Request) {
  try {
    // 1. Query Data from HOSxP
    const query = `
      SELECT
          w.ward,
          w.name AS ward_name,

          COUNT(DISTINCT b.bedno) AS total_bed,

          COUNT(DISTINCT CASE
              WHEN i.dchdate IS NULL
              THEN ia.bedno
          END) AS occupied_bed,

          COUNT(DISTINCT b.bedno)
          - COUNT(DISTINCT CASE
              WHEN i.dchdate IS NULL
              THEN ia.bedno
          END) AS available_bed,

          ROUND(
              COUNT(DISTINCT CASE
                  WHEN i.dchdate IS NULL
                  THEN ia.bedno
              END) * 100
              / NULLIF(COUNT(DISTINCT b.bedno),0)
          ,2) AS occupancy_rate,
          MAX(b.export_code) AS export_code

      FROM bedno b
      LEFT JOIN roomno r ON r.roomno = b.roomno
      LEFT JOIN ward w ON w.ward = r.ward
      LEFT JOIN iptadm ia ON ia.bedno = b.bedno
      LEFT JOIN ipt i ON i.an = ia.an

      WHERE w.ward_active = 'Y'
        AND b.export_code IS NOT NULL

      GROUP BY w.ward,w.name
      ORDER BY w.name;
    `;

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

    for (const row of rows) {
      const {
        ward,
        ward_name,
        total_bed,
        occupied_bed,
        available_bed,
        occupancy_rate,
        export_code
      } = row;

      const upsertQuery = `
        INSERT INTO bed_management_summary 
        (ward_code, ward_name, total_bed, occupied_bed, available_bed, occupancy_rate, export_code, last_sync_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        ward_name = VALUES(ward_name),
        total_bed = VALUES(total_bed),
        occupied_bed = VALUES(occupied_bed),
        available_bed = VALUES(available_bed),
        occupancy_rate = VALUES(occupancy_rate),
        export_code = VALUES(export_code),
        last_sync_at = VALUES(last_sync_at);
      `;

      await localDb.query(upsertQuery, [
        ward,
        ward_name,
        total_bed,
        occupied_bed,
        available_bed,
        occupancy_rate,
        export_code,
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
