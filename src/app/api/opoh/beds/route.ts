import { NextResponse } from 'next/server';
import localDb from '@/lib/db/local';

export const dynamic = 'force-dynamic'; // Always fetch fresh data

export async function GET(request: Request) {
  try {
    // 1. Security Check: Bearer Token (API Key)
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
    const hospitalShortName = process.env.NEXT_PUBLIC_HOSPITAL_NAME || 'KALASIN';

    if (!hospitalCode || !hospitalFullName) {
      return NextResponse.json({ 
        success: false, 
        message: 'ยังไม่ได้กำหนดค่ารหัสหน่วยบริการ (Hospital Code) หรือชื่อโรงพยาบาล (Full Name) กรุณาตั้งค่าในระบบก่อน' 
      }, { status: 400 });
    }

    // 3. Query Bed Data
    const query = `
      SELECT 
        ward_code,
        ward_name,
        total_bed,
        actual_bed,
        occupied_bed,
        IFNULL(actual_bed, total_bed) AS active_total_bed,
        (IFNULL(actual_bed, total_bed) - occupied_bed) AS available_bed,
        ROUND((occupied_bed * 100) / NULLIF(IFNULL(actual_bed, total_bed), 0), 2) AS occupancy_rate,
        export_code,
        last_sync_at
      FROM bed_management_summary
      ORDER BY ward_name ASC
    `;

    const [rows]: any = await localDb.query(query);

    // 4. Calculate Summary
    let totalActiveBeds = 0;
    let totalOccupied = 0;
    let totalAvailable = 0;

    const data = rows.map((row: any) => {
      totalActiveBeds += Number(row.active_total_bed || 0);
      totalOccupied += Number(row.occupied_bed || 0);
      totalAvailable += Number(row.available_bed || 0);

      return {
        export_code: row.export_code,
        ward_code: row.ward_code,
        ward_name: row.ward_name,
        active_beds: Number(row.active_total_bed || 0),
        occupied: Number(row.occupied_bed || 0),
        available: Number(row.available_bed || 0),
        occupancy_rate: Number(row.occupancy_rate || 0),
        last_sync_at: row.last_sync_at
      };
    });

    const overallOccupancyRate = totalActiveBeds > 0 
      ? Number(((totalOccupied * 100) / totalActiveBeds).toFixed(2)) 
      : 0;

    // 5. Construct JSON Response
    return NextResponse.json({
      success: true,
      hospital_code: hospitalCode,
      hospital_name: hospitalFullName,
      hospital_short_name: hospitalShortName,
      timestamp: new Date().toISOString(),
      summary: {
        total_active_beds: totalActiveBeds,
        total_occupied: totalOccupied,
        total_available: totalAvailable,
        overall_occupancy_rate: overallOccupancyRate
      },
      data: data
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in export beds API:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch and export bed data',
      error: error.message
    }, { status: 500 });
  }
}
