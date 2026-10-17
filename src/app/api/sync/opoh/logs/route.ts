import { NextResponse } from 'next/server';
import { getSyncLogs, clearSyncLogs } from '@/lib/services/opoh-sync-service';
import { getSession, isUserAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit')) || 50;
    const logs = await getSyncLogs(limit);

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length,
    });
  } catch (error: any) {
    console.error('Error fetching OPOH sync logs:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'ไม่สามารถดึงประวัติการส่งข้อมูลได้' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sync/opoh/logs?mode=truncate|older_7_days|older_30_days
 * Requires Admin privileges
 */
export async function DELETE(req: Request) {
  try {
    // 1. Strict Admin Authorization Check (Universal HOSxP & Local admin verification)
    const session = await getSession();
    const isAdmin = isUserAdmin(session);

    if (!isAdmin) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'ปฏิเสธการเข้าถึง: ฟังก์ชันล้างประวัติ Logs สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น' 
        },
        { status: 403 }
      );
    }

    // 2. Parse mode (defaults to 'truncate')
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get('mode') || 'truncate') as 'truncate' | 'older_7_days' | 'older_30_days';

    const result = await clearSyncLogs(mode);

    return NextResponse.json({
      success: true,
      message: result.message,
      clearedCount: result.clearedCount,
      adminUser: session?.username || 'admin',
    });
  } catch (error: any) {
    console.error('Error clearing OPOH sync logs:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'เกิดข้อผิดพลาดในการล้างข้อมูล Logs' },
      { status: 500 }
    );
  }
}
