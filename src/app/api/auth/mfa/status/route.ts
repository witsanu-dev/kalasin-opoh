import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserMfaStatus } from '@/lib/mfa';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.username) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบข้อมูลการเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const mfaStatus = await getUserMfaStatus(session.username);

    return NextResponse.json({
      success: true,
      username: session.username,
      ...mfaStatus,
    });
  } catch (error: any) {
    console.error('Error getting MFA status:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ MFA' },
      { status: 500 }
    );
  }
}
