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

    // 3. Query Data from Local DB for own hospital
    const query = `
      SELECT 
        hospital_code,
        hospital_name,
        total_cases,
        general_surgery,
        ortho_surgery,
        eye_surgery,
        obgyn_surgery,
        urgency_level_desc,
        last_sync_at
      FROM waiting_or_summary
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

    // Extract urgency counts
    let urgency_high = 0, urgency_med = 0, urgency_low = 0;
    if (row.urgency_level_desc) {
      const matchHigh = row.urgency_level_desc.match(/ฉุกเฉิน \(Emergency\):\s*(\d+)/);
      const matchMed = row.urgency_level_desc.match(/เร่งด่วน \(Urgency\):\s*(\d+)/);
      const matchLow = row.urgency_level_desc.match(/รอตามนัด \(Elective\):\s*(\d+)/);
      if (matchHigh) urgency_high = parseInt(matchHigh[1]) || 0;
      if (matchMed) urgency_med = parseInt(matchMed[1]) || 0;
      if (matchLow) urgency_low = parseInt(matchLow[1]) || 0;
    }

    // 5. Construct JSON Response
    return NextResponse.json({
      success: true,
      hospital_code: hospitalCode,
      hospital_name: hospitalFullName,
      hospital_short_name: hospitalShortName,
      timestamp: new Date().toISOString(),
      data: {
        total_cases: Number(row.total_cases || 0),
        general_surgery: Number(row.general_surgery || 0),
        ortho_surgery: Number(row.ortho_surgery || 0),
        eye_surgery: Number(row.eye_surgery || 0),
        obgyn_surgery: Number(row.obgyn_surgery || 0),
        urgency_high,
        urgency_med,
        urgency_low,
        urgency_level_desc: row.urgency_level_desc,
        last_sync_at: row.last_sync_at
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in export waiting-or API:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch and export Surgical Queue data',
      error: error.message
    }, { status: 500 });
  }
}
