import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(req: Request) {
  try {
    const { host, port, user, password, database } = await req.json();

    if (!host || !port || !user || !database) {
      return NextResponse.json(
        { success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน (Host, Port, User, Database)' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection({
      host: host,
      port: Number(port),
      user: user,
      password: password || '',
      database: database,
      connectTimeout: 5000,
    });

    // Test a simple query
    await connection.execute('SELECT 1');
    await connection.end();

    return NextResponse.json({ success: true, message: 'การเชื่อมต่อสำเร็จ!' });
  } catch (error: any) {
    console.error('Database Connection Error:', error.message);
    return NextResponse.json(
      { success: false, message: `ไม่สามารถเชื่อมต่อได้: ${error.message}` },
      { status: 500 }
    );
  }
}
