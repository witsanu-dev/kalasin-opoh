import { NextResponse } from 'next/server';
import { getUnifiedConfig, saveUnifiedConfig } from '@/lib/services/system-config-service';
import { getSession, isUserAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: จำเป็นต้องเข้าสู่ระบบก่อนดูการตั้งค่า' },
        { status: 401 }
      );
    }
    if (!isUserAdmin(session)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น' },
        { status: 403 }
      );
    }

    const { flat } = await getUnifiedConfig({ maskSecrets: true });
    return NextResponse.json({ success: true, data: flat });
  } catch (error: any) {
    console.error('Error in GET /api/settings:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: จำเป็นต้องเข้าสู่ระบบก่อนบันทึกการตั้งค่า' },
        { status: 401 }
      );
    }
    if (!isUserAdmin(session)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น' },
        { status: 403 }
      );
    }

    const updates = await req.json();
    const result = await saveUnifiedConfig(updates, session.username);
    return NextResponse.json({
      success: true,
      message: 'บันทึกการตั้งค่าสำเร็จ ข้อมูลอัปเดตทันทีโดยไม่ต้อง Restart Server',
      config: result.config,
    });
  } catch (error: any) {
    console.error('Error in POST /api/settings:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
