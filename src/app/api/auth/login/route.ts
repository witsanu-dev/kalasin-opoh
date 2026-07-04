import { NextResponse } from 'next/server';
import pool from '@/lib/db/local';
import bcrypt from 'bcryptjs';
import { encrypt } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }, { status: 400 });
    }

    // Query user from local database
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
    
    if (!rows || (rows as any[]).length === 0) {
      return NextResponse.json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    const user = (rows as any[])[0];

    if (user.is_active !== 1) {
      return NextResponse.json({ success: false, message: 'บัญชีนี้ถูกระงับการใช้งาน' }, { status: 403 });
    }

    // Verify password
    const passwordsMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordsMatch) {
      return NextResponse.json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    // Update last_login_at
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    // Create session payload
    const sessionData = {
      id: user.id,
      cid: user.cid,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      hospital_code: user.hospital_code,
    };

    // Encrypt to JWT
    const sessionToken = await encrypt(sessionData);

    // Set HTTP-Only Cookie
    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return NextResponse.json({ 
      success: true, 
      message: 'เข้าสู่ระบบสำเร็จ',
      user: sessionData 
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, message: 'ระบบขัดข้อง โปรดลองใหม่อีกครั้ง' }, { status: 500 });
  }
}
