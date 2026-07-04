import { NextResponse } from 'next/server';
import localDb from '@/lib/db/local';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      general = 0, 
      ortho = 0, 
      eye = 0, 
      obgyn = 0, 
      highUrgency = 0, 
      medUrgency = 0, 
      lowUrgency = 0 
    } = body;

    // Read hospital info from env
    const hospitalCode = process.env.NEXT_PUBLIC_HOSPITAL_CODE || '00000';
    const hospitalName = process.env.NEXT_PUBLIC_HOSPITAL_FULL_NAME || 'Unknown Hospital';

    const general_surgery = Number(general);
    const ortho_surgery = Number(ortho);
    const eye_surgery = Number(eye);
    const obgyn_surgery = Number(obgyn);
    const total_cases = general_surgery + ortho_surgery + eye_surgery + obgyn_surgery;
    
    // Construct urgency string
    const urgency_level_desc = `ฉุกเฉิน (Emergency): ${Number(highUrgency)}, เร่งด่วน (Urgency): ${Number(medUrgency)}, รอตามนัด (Elective): ${Number(lowUrgency)}`;

    const getBangkokTime = () => {
      const d = new Date();
      const bangkokTime = new Date(d.getTime() + (7 * 60 * 60 * 1000));
      return bangkokTime.toISOString().replace('T', ' ').replace('Z', '');
    };
    const nowStr = getBangkokTime();

    // Sync (Upsert) to local db_opoh
    const upsertQuery = `
      INSERT INTO waiting_or_summary 
      (hospital_code, hospital_name, total_cases, general_surgery, ortho_surgery, eye_surgery, obgyn_surgery, urgency_level_desc, last_sync_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      hospital_name = VALUES(hospital_name),
      total_cases = VALUES(total_cases),
      general_surgery = VALUES(general_surgery),
      ortho_surgery = VALUES(ortho_surgery),
      eye_surgery = VALUES(eye_surgery),
      obgyn_surgery = VALUES(obgyn_surgery),
      urgency_level_desc = VALUES(urgency_level_desc),
      last_sync_at = VALUES(last_sync_at);
    `;

    await localDb.query(upsertQuery, [
      hospitalCode,
      hospitalName,
      total_cases,
      general_surgery,
      ortho_surgery,
      eye_surgery,
      obgyn_surgery,
      urgency_level_desc,
      nowStr
    ]);

    return NextResponse.json({ 
      success: true, 
      message: 'อัปเดตข้อมูลคิวผ่าตัดสำเร็จ',
      data: {
        total_cases, general_surgery, ortho_surgery, eye_surgery, obgyn_surgery, urgency_level_desc
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error updating surgical queue:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to update Surgical Queue data',
      error: error.message 
    }, { status: 500 });
  }
}
