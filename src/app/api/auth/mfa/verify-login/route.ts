import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decryptMfaToken, encrypt, isCookieSecure } from '@/lib/auth';
import { verifyUserMfaForLogin } from '@/lib/mfa';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { mfaToken, token } = await req.json();

    if (!mfaToken || !token) {
      return NextResponse.json(
        { success: false, message: 'ข้อมูลไม่ครบถ้วน กรุณากรอกรหัสยืนยัน 6 หลัก' },
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

    const cleanToken = String(token).trim();
    const isValid = await verifyUserMfaForLogin(sessionData.username, cleanToken);

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'รหัสยืนยัน 6 หลักไม่ถูกต้อง หรือหมดอายุ กรุณาตรวจสอบจากแอป Google Authenticator' },
        { status: 401 }
      );
    }

    // Clean pre-auth fields
    const { isMfaPreAuth, exp, iat, ...cleanPayload } = sessionData as any;

    // Issue permanent session cookie
    const fullSessionToken = await encrypt(cleanPayload);
    const cookieStore = await cookies();
    cookieStore.set('session', fullSessionToken, {
      httpOnly: true,
      secure: isCookieSecure(),
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return NextResponse.json({
      success: true,
      message: 'ยืนยันตัวตน 2 ขั้นตอนสำเร็จ เข้าสู่ระบบเรียบร้อย',
      user: cleanPayload,
    });
  } catch (error: any) {
    console.error('Login MFA verification error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบรหัส MFA' },
      { status: 500 }
    );
  }
}
