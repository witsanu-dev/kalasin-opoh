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

    // 3. Query OR Data from Local DB
    const query = `
      SELECT 
        hospital_code,
        hospital_name,
        room_available_str,
        operating_count,
        waiting_count,
        completed_count,
        cancelled_count,
        total_case_today,
        last_sync_at
      FROM or_management_summary
      LIMIT 1
    `;

    const [rows]: any = await localDb.query(query);

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: true,
        hospital_code: hospitalCode,
        hospital_name: hospitalFullName,
        hospital_short_name: hospitalShortName,
        timestamp: new Date().toISOString(),
        data: null,
        message: "No data available. Please sync first."
      }, { status: 200 });
    }

    const row = rows[0];

    // 5. Construct JSON Response
    return NextResponse.json({
      success: true,
      hospital_code: hospitalCode,
      hospital_name: hospitalFullName,
      hospital_short_name: hospitalShortName,
      timestamp: new Date().toISOString(),
      data: {
        room_available: row.room_available_str,
        operating: Number(row.operating_count || 0),
        waiting: Number(row.waiting_count || 0),
        completed: Number(row.completed_count || 0),
        cancelled: Number(row.cancelled_count || 0),
        total_cases: Number(row.total_case_today || 0),
        last_sync_at: row.last_sync_at
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in export OR API:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch and export OR data',
      error: error.message
    }, { status: 500 });
  }
}
