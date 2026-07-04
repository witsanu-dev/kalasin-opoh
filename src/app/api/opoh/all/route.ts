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

    // 3. Fetch all data
    const [bedRows] = await localDb.query('SELECT * FROM bed_management_summary');
    const [orRows] = await localDb.query('SELECT * FROM or_management_summary');
    const [lrRows] = await localDb.query('SELECT * FROM lr_management_summary');
    const [sqRows] = await localDb.query('SELECT * FROM waiting_or_summary');

    // 4. Construct Unified JSON Payload
    const payload = {
      hospital_code: hospitalCode,
      hospital_name: hospitalFullName,
      timestamp: new Date().toISOString(),
      data: {
        beds: bedRows,
        or: orRows,
        lr: lrRows,
        surgical_queue: sqRows
      }
    };

    return NextResponse.json({
      success: true,
      data: payload
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in unified export API:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch unified export data',
      error: error.message
    }, { status: 500 });
  }
}
