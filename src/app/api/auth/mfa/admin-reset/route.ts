import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { adminResetUserMfa } from '@/lib/mfa';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.username) {
      return NextResponse.json(
        { success: false, message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' },
        { status: 401 }
      );
    }

    const { username } = await req.json();

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json(
        { success: false, message: 'กรุณาระบุชื่อผู้ใช้งานที่ต้องการรีเซ็ต MFA' },
        { status: 400 }
      );
    }

    const result = await adminResetUserMfa(username.trim(), session.username);

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error: any) {
    console.error('Admin reset MFA API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'เกิดข้อผิดพลาดในการรีเซ็ต MFA' },
      { status: 500 }
    );
  }
}
