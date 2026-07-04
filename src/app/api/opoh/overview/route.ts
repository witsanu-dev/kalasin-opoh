import { NextResponse } from 'next/server';
import localDb from '@/lib/db/local';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Security Check: Bearer Token
    const authHeader = request.headers.get('Authorization');
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        message: 'System is not configured. Missing API_KEY in settings.' 
      }, { status: 503 });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== apiKey) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized. Invalid or missing API Key.' 
      }, { status: 401 });
    }

    // 2. Pre-condition Validation: Check Hospital Config
    const hospitalCode = process.env.NEXT_PUBLIC_HOSPITAL_CODE;
    const hospitalFullName = process.env.NEXT_PUBLIC_HOSPITAL_FULL_NAME;

    if (!hospitalCode || !hospitalFullName) {
      return NextResponse.json({ 
        success: false, 
        message: 'ยังไม่ได้กำหนดค่ารหัสหน่วยบริการ (Hospital Code) หรือชื่อโรงพยาบาล (Full Name) กรุณาตั้งค่าในระบบก่อน' 
      }, { status: 400 });
    }

    // 3. Fetch Bed Data
    const bedQuery = `
      SELECT 
        ward_code, ward_name, total_bed, actual_bed, occupied_bed, export_code, last_sync_at
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
      
      totalBeds += activeBed;
      totalOccupiedBeds += occupied;

      const name = (row.ward_name || '').toLowerCase();
      const code = (row.ward_code || '').toLowerCase();
      const expCode = (row.export_code || '').toLowerCase();
      if (name.includes('icu') || code === 'icu' || expCode === 'icu') {
        totalIcuBeds += activeBed;
        totalOccupiedIcu += occupied;
      }

      const syncTime = new Date(row.last_sync_at).getTime();
      if (syncTime > maxBedSyncDate) {
        maxBedSyncDate = syncTime;
      }
    });

    const totalAvailableBeds = Math.max(0, totalBeds - totalOccupiedBeds);
    const totalAvailableIcu = Math.max(0, totalIcuBeds - totalOccupiedIcu);

    // 4. Fetch OR Data
    const orQuery = `
      SELECT total_case_today, waiting_count, last_sync_at
      FROM or_management_summary
      LIMIT 1
    `;
    const [orRows]: any = await localDb.query(orQuery);
    const orData = orRows.length > 0 ? orRows[0] : null;

    const orCasesToday = orData ? Number(orData.total_case_today || 0) : 0;
    const orWaiting = orData ? Number(orData.waiting_count || 0) : 0;

    const orSyncTime = orData ? new Date(orData.last_sync_at).getTime() : 0;
    const lastSyncAt = new Date(Math.max(maxBedSyncDate, orSyncTime));

    // 5. Construct JSON Response
    const overview = {
      hospital_code: hospitalCode,
      hospital_name: hospitalFullName,
      timestamp: new Date().toISOString(),
      last_sync_at: lastSyncAt.toISOString(),
      summary: {
        total_beds: totalBeds,
        available_beds: totalAvailableBeds,
        total_icu: totalIcuBeds,
        available_icu: totalAvailableIcu,
        or_cases_today: orCasesToday,
        or_waiting: orWaiting,
        lr_cases_today: 0
      }
    };

    return NextResponse.json({
      success: true,
      data: overview
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in export overview API:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch and export overview data',
      error: error.message
    }, { status: 500 });
  }
}
