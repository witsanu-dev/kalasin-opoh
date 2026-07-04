import { NextResponse } from 'next/server';
import localDb from '@/lib/db/local';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const hospitalName = process.env.NEXT_PUBLIC_HOSPITAL_FULL_NAME || 'โรงพยาบาล';

    // 1. Fetch Bed Data (All)
    const bedQuery = `
      SELECT 
        ward_code,
        ward_name,
        total_bed,
        actual_bed,
        occupied_bed,
        export_code,
        last_sync_at
      FROM bed_management_summary
    `;
    const [bedRows]: any = await localDb.query(bedQuery);

    let totalBeds = 0;
    let totalOccupiedBeds = 0;
    let totalIcuBeds = 0;
    let totalOccupiedIcu = 0;
    let maxBedSyncDate = 0;

    bedRows.forEach((row: any) => {
      const activeBed = row.actual_bed !== null ? row.actual_bed : row.total_bed;
      const occupied = row.occupied_bed || 0;
      
      // Accumulate Total Beds
      totalBeds += activeBed;
      totalOccupiedBeds += occupied;

      // Check if ICU
      const name = (row.ward_name || '').toLowerCase();
      const code = (row.ward_code || '').toLowerCase();
      const expCode = (row.export_code || '').toLowerCase();
      if (name.includes('icu') || code === 'icu' || expCode === 'icu') {
        totalIcuBeds += activeBed;
        totalOccupiedIcu += occupied;
      }

      // Track latest sync time
      const syncTime = new Date(row.last_sync_at).getTime();
      if (syncTime > maxBedSyncDate) {
        maxBedSyncDate = syncTime;
      }
    });

    const totalAvailableBeds = Math.max(0, totalBeds - totalOccupiedBeds);
    const totalAvailableIcu = Math.max(0, totalIcuBeds - totalOccupiedIcu);

    // 2. Fetch OR Data
    const orQuery = `
      SELECT 
        total_case_today,
        waiting_count,
        last_sync_at
      FROM or_management_summary
      LIMIT 1
    `;
    const [orRows]: any = await localDb.query(orQuery);
    const orData = orRows.length > 0 ? orRows[0] : null;

    const orCasesToday = orData ? Number(orData.total_case_today || 0) : 0;

    // Track latest sync time from OR
    const orSyncTime = orData ? new Date(orData.last_sync_at).getTime() : 0;

    // 2.5 Fetch Surgical Queue Data
    const sqQuery = `
      SELECT SUM(total_cases) as total_waiting, MAX(last_sync_at) as sq_sync_at 
      FROM waiting_or_summary
    `;
    const [sqRows]: any = await localDb.query(sqQuery);
    const sqData = sqRows.length > 0 ? sqRows[0] : null;
    const orWaiting = sqData ? Number(sqData.total_waiting || 0) : 0;
    const sqSyncTime = sqData && sqData.sq_sync_at ? new Date(sqData.sq_sync_at).getTime() : 0;
    
    // 3. Fetch LR Data (Use waiting_labor instead of total_case)
    const lrQuery = `
      SELECT 
        hospital_code,
        waiting_labor,
        last_sync_at
      FROM lr_management_summary
    `;
    const [lrRows]: any = await localDb.query(lrQuery);
    
    let lrCasesToday = 0;
    let lrSyncTime = 0;
    
    if (lrRows && lrRows.length > 0) {
      const hospitalCode = process.env.NEXT_PUBLIC_HOSPITAL_CODE;
      const mainHospitalData = lrRows.find((r: any) => r.hospital_code === hospitalCode);
      
      // If main hospital has waiting_labor > 0, use it. Otherwise sum all.
      if (mainHospitalData && mainHospitalData.waiting_labor > 0) {
        lrCasesToday = Number(mainHospitalData.waiting_labor);
        lrSyncTime = new Date(mainHospitalData.last_sync_at).getTime();
      } else {
        lrCasesToday = lrRows.reduce((sum: number, r: any) => sum + Number(r.waiting_labor || 0), 0);
        const latestSync = Math.max(...lrRows.map((r: any) => new Date(r.last_sync_at).getTime()));
        lrSyncTime = isFinite(latestSync) ? latestSync : 0;
      }
    }

    const lastSyncAt = new Date(Math.max(maxBedSyncDate, orSyncTime, sqSyncTime, lrSyncTime));

    // Compile Overview Data
    const overview = {
      hospital_name: hospitalName,
      last_sync_at: lastSyncAt.toISOString(),
      summary: {
        total_beds: totalBeds,
        available_beds: totalAvailableBeds,
        total_icu: totalIcuBeds,
        available_icu: totalAvailableIcu,
        or_cases_today: orCasesToday,
        or_waiting: orWaiting,
        lr_cases_today: lrCasesToday
      }
    };

    return NextResponse.json({
      success: true,
      data: overview
    });

  } catch (error: any) {
    console.error('Error fetching overview data:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch overview data',
      error: error.message
    }, { status: 500 });
  }
}
