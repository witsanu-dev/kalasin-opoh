import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllMfaUsers } from '@/lib/mfa';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.username) {
      return NextResponse.json(
        { success: false, message: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const users = await getAllMfaUsers();

    return NextResponse.json({
      success: true,
      users,
      total: users.length,
      activeCount: users.filter(u => u.is_enabled).length,
    });
  } catch (error: any) {
    console.error('Error fetching MFA users list:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'ไม่สามารถดึงข้อมูลผู้ใช้งาน MFA ได้' },
      { status: 500 }
    );
  }
}
