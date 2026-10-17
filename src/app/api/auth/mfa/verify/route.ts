import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { confirmAndEnableMfa } from '@/lib/mfa';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.username) {
      return NextResponse.json(
        { success: false, message: 'กรุณาเข้าสู่ระบบก่อนทำการยืนยัน' },
        { status: 401 }
      );
    }

    const { token } = await req.json();
    if (!token || String(token).trim().length !== 6) {
      return NextResponse.json(
        { success: false, message: 'กรุณาระบุรหัสยืนยัน 6 หลักจาก Google Authenticator' },
        { status: 400 }
      );
    }

    const result = await confirmAndEnableMfa(session.username, String(token).trim());

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error('Error confirming MFA:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'เกิดข้อผิดพลาดในการยืนยันรหัส MFA' },
      { status: 500 }
    );
  }
}
