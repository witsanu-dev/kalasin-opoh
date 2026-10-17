import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prepareUserMfaSetup } from '@/lib/mfa';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await getSession();
    if (!session || !session.username) {
      return NextResponse.json(
        { success: false, message: 'กรุณาเข้าสู่ระบบก่อนทำการตั้งค่า' },
        { status: 401 }
      );
    }

    const hospitalName = process.env.NEXT_PUBLIC_HOSPITAL_NAME || 'KALASIN';
    const setupData = await prepareUserMfaSetup(session.username, hospitalName);

    return NextResponse.json({
      success: true,
      username: session.username,
      ...setupData,
    });
  } catch (error: any) {
    console.error('Error preparing MFA setup:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'เกิดข้อผิดพลาดในการสร้าง QR Code สำหรับ Google Authenticator' },
      { status: 500 }
    );
  }
}
