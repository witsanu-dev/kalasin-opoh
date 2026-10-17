import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { disableUserMfa } from '@/lib/mfa';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await getSession();
    if (!session || !session.username) {
      return NextResponse.json(
        { success: false, message: 'กรุณาเข้าสู่ระบบก่อนทำการปิดการใช้งาน' },
        { status: 401 }
      );
    }

    const result = await disableUserMfa(session.username);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error disabling MFA:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'เกิดข้อผิดพลาดในการปิดการใช้งาน MFA' },
      { status: 500 }
    );
  }
}
