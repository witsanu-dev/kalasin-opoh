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

    // 3. Query LR Data from Local DB for own hospital
    const query = `
      SELECT 
        hospital_code,
        hospital_name,
        waiting_labor,
        normal_delivery,
        cesarean_delivery,
        abortion,
        not_delivery,
        total_case,
        last_sync_at
      FROM lr_management_summary
      WHERE hospital_code = ?
      LIMIT 1
    `;

    const [rows]: any = await localDb.query(query, [hospitalCode]);

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
        waiting_labor: Number(row.waiting_labor || 0),
        normal_delivery: Number(row.normal_delivery || 0),
        cesarean_delivery: Number(row.cesarean_delivery || 0),
        abortion: Number(row.abortion || 0),
        not_delivery: Number(row.not_delivery || 0),
        total_cases: Number(row.total_case || 0),
        last_sync_at: row.last_sync_at
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in export LR API:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch and export LR data',
      error: error.message
    }, { status: 500 });
  }
}
