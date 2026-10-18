import { NextResponse } from 'next/server';
import { getUnifiedConfig, saveUnifiedConfig } from '@/lib/services/system-config-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { flat } = await getUnifiedConfig();
    return NextResponse.json({ success: true, data: flat });
  } catch (error: any) {
    console.error('Error in GET /api/settings:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const updates = await req.json();
    const result = await saveUnifiedConfig(updates);
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
