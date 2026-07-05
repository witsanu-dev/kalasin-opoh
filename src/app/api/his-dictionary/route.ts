import { NextResponse } from 'next/server';
import hosxpDb from '@/lib/db/hosxp';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Attempt to query lookup tables. Fallback to distinct values if tables don't exist.
    let operationStatus = [];
    let laborStatus = [];
    let laborType = [];
    
    try {
      const [opStat]: any = await hosxpDb.query("SELECT operation_status_id as id, operation_status_name as name FROM operation_status");
      operationStatus = opStat;
    } catch(e) {
      // Fallback
      operationStatus = [
        { id: 1, name: 'รอผ่าตัด (Waiting)' },
        { id: 2, name: 'กำลังผ่าตัด (Operating)' },
        { id: 3, name: 'ผ่าตัดเสร็จแล้ว (Completed)' },
        { id: 9, name: 'ยกเลิก (Cancelled)' }
      ];
    }

    try {
      const [lbStat]: any = await hosxpDb.query("SELECT labor_status_id as id, labor_status_name as name FROM labor_status");
      laborStatus = lbStat;
    } catch(e) {
      laborStatus = [
        { id: 1, name: 'รอคลอด (Waiting Labor)' },
        { id: 2, name: 'คลอดแล้ว (Delivered)' },
        { id: 3, name: 'แท้ง (Abortion)' },
        { id: 4, name: 'ไม่คลอด (Not Delivery)' }
      ];
    }

    try {
      const [lbType]: any = await hosxpDb.query("SELECT person_labor_type_id as id, person_labor_type_name as name FROM person_labor_type");
      laborType = lbType;
    } catch(e) {
      laborType = [
        { id: 1, name: 'คลอดปกติ (Normal Delivery)' },
        { id: 2, name: 'ผ่าคลอด (Cesarean)' }
      ];
    }

    return NextResponse.json({
      success: true,
      data: {
        operationStatus,
        laborStatus,
        laborType
      }
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
