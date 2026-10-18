import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isCookieSecure } from '@/lib/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    // Clear the session cookie
    cookieStore.set('session', '', {
      httpOnly: true,
      secure: isCookieSecure(),
      sameSite: 'lax',
      path: '/',
      maxAge: 0, // Expire immediately
    });

    return NextResponse.json({ success: true, message: 'ออกจากระบบสำเร็จ' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดในการออกจากระบบ' }, { status: 500 });
  }
}
