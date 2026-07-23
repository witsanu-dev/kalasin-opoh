import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(req: Request) {
  try {
    const config = await req.json();

    if (!config.host || !config.user || !config.database) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลการเชื่อมต่อไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    // Try to establish a connection with the provided credentials
    const connection = await mysql.createConnection({
      host: config.host,
      port: Number(config.port) || 3306,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 5000, // 5 seconds timeout
    });

    // Test a simple query to ensure we have access to the database
    await connection.query('SELECT 1');
    
    // Close the connection
    await connection.end();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Database connection test failed:', error);
    
    let errorMessage = 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้';
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      errorMessage = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (Access Denied)';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      errorMessage = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (Connection Refused/Timeout)';
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      errorMessage = 'ไม่พบชื่อฐานข้อมูลที่ระบุ (Unknown Database)';
    }

    // Include the raw system error message for standard debugging
    const rawError = error.message || String(error);
    const debugMessage = `${errorMessage}\n\n[System Debug]:\nError Code: ${error.code || 'UNKNOWN'}\nDetails: ${rawError}`;

    return NextResponse.json({ success: false, error: debugMessage }, { status: 500 });
  }
}
