import { NextResponse } from 'next/server';
import { getUnifiedConfig, saveUnifiedConfig } from '@/lib/services/system-config-service';
import { getSession, isUserAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: จำเป็นต้องเข้าสู่ระบบก่อนดูข้อมูลการตั้งค่าฐานข้อมูล' },
        { status: 401 }
      );
    }
    if (!isUserAdmin(session)) {
      return NextResponse.json(
        { error: 'Forbidden: เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถดูข้อมูลการตั้งค่าฐานข้อมูลได้' },
        { status: 403 }
      );
    }

    const { grouped } = await getUnifiedConfig({ maskSecrets: true });
    return NextResponse.json(grouped);
  } catch (error: any) {
    console.error('Error reading system configuration:', error);
    return NextResponse.json({ error: 'Failed to read configuration' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: จำเป็นต้องเข้าสู่ระบบก่อนทำการแก้ไขการตั้งค่า' },
        { status: 401 }
      );
    }
    if (!isUserAdmin(session)) {
      return NextResponse.json(
        { error: 'Forbidden: เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถบันทึกการตั้งค่าระบบได้' },
        { status: 403 }
      );
    }

    const config = await req.json();
    const result = await saveUnifiedConfig(config, session.username);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error saving system configuration:', error);
    return NextResponse.json({ error: error.message || 'Failed to save configuration' }, { status: 500 });
  }
}
