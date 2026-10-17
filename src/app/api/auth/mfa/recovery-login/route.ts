import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decryptMfaToken, encrypt } from '@/lib/auth';
import { verifyAndConsumeRecoveryCode } from '@/lib/mfa';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { mfaToken, recoveryCode } = await req.json();

    if (!mfaToken || !recoveryCode) {
      return NextResponse.json(
        { success: false, message: 'กรุณากรอกรหัสกู้คืนฉุกเฉิน (Recovery Code)' },
        { status: 400 }
      );
    }

    const sessionData = await decryptMfaToken(mfaToken);
    if (!sessionData || !sessionData.username) {
      return NextResponse.json(
        { success: false, message: 'คำขอเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง' },
        { status: 401 }
      );
    }

    const result = await verifyAndConsumeRecoveryCode(sessionData.username, String(recoveryCode).trim());

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    // Clean pre-auth fields
    const { isMfaPreAuth, exp, iat, ...cleanPayload } = sessionData as any;

    // Issue permanent session cookie
    const fullSessionToken = await encrypt(cleanPayload);
    const cookieStore = await cookies();
    cookieStore.set('session', fullSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      user: cleanPayload,
      mfaReset: true,
    });
  } catch (error: any) {
    console.error('Emergency recovery login error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบรหัสกู้คืน' },
      { status: 500 }
    );
  }
}
