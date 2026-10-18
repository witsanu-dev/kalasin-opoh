import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import hosxpDb from '@/lib/db/hosxp';
import localDb from '@/lib/db/local';
import { resolveDbHost } from '@/lib/db/host-resolver';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timeoutPromise = (ms: number) =>
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Connection timed out')), ms));

  const testHosxp = async () => {
    try {
      await Promise.race([hosxpDb.query('SELECT 1'), timeoutPromise(3000)]);
      return {
        online: true,
        host: process.env.HOSXP_DB_HOST || '',
        database: process.env.HOSXP_DB_NAME || ''
      };
    } catch (e: any) {
      return {
        online: false,
        host: process.env.HOSXP_DB_HOST || '',
        database: process.env.HOSXP_DB_NAME || '',
        error: e.message
      };
    }
  };

  const testLocal = async () => {
    try {
      await Promise.race([localDb.query('SELECT 1'), timeoutPromise(3000)]);
      return {
        online: true,
        host: process.env.LOCAL_DB_HOST || '',
        database: process.env.LOCAL_DB_NAME || ''
      };
    } catch (e: any) {
      return {
        online: false,
        host: process.env.LOCAL_DB_HOST || '',
        database: process.env.LOCAL_DB_NAME || '',
        error: e.message
      };
    }
  };

  const [hosxpResult, localResult] = await Promise.all([testHosxp(), testLocal()]);

  const count = (hosxpResult.online ? 1 : 0) + (localResult.online ? 1 : 0);
  let status: 'online' | 'connecting' | 'offline' = 'offline';
  if (count === 2) {
    status = 'online';
  } else if (count === 1) {
    status = 'connecting';
  } else {
    status = 'offline';
  }

  return NextResponse.json({
    success: true,
    status,
    count,
    hosxp: hosxpResult,
    local: localResult
  });
}

export async function POST(req: Request) {
  try {
    const config = await req.json();

    if (!config.host || !config.user || !config.database) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลการเชื่อมต่อไม่ครบถ้วน (กรุณาระบุ Host, User และ Database)' },
        { status: 400 }
      );
    }

    // Try to establish a connection with the provided credentials
    const effectiveHost = resolveDbHost(config.host);
    const connection = await mysql.createConnection({
      host: effectiveHost,
      port: Number(config.port) || 3306,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 5000, // 5 seconds timeout
    });

    // 1. Basic Ping
    await connection.query('SELECT 1');

    // 2. Deep Table & Permission Check for HOSxP
    const isHosxp = config.database.toLowerCase().includes('hos');
    const checkedTables: string[] = [];
    const missingTables: string[] = [];

    if (isHosxp) {
      const coreTables = ['opduser', 'officer', 'doctor', 'ward'];
      for (const t of coreTables) {
        try {
          await connection.query(`SELECT 1 FROM ${t} LIMIT 1`);
          checkedTables.push(t);
        } catch (e: any) {
          missingTables.push(t);
        }
      }
    }

    // Close connection
    await connection.end();

    if (missingTables.length > 0) {
      return NextResponse.json({
        success: true,
        warning: true,
        message: `เชื่อมต่อสำเร็จ แต่ไม่พบหรือไม่มีสิทธิ์ในบางตาราง: ${missingTables.join(', ')}`,
        checkedTables,
        missingTables
      });
    }

    return NextResponse.json({
      success: true,
      message: isHosxp
        ? `เชื่อมต่อฐานข้อมูล HOSxP สำเร็จ`
        : 'เชื่อมต่อฐานข้อมูลระบบสำเร็จ'
    });
  } catch (error: any) {
    console.error('Database connection test failed:', error);

    let errorMessage = 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้';
    let grantScript = '';

    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      errorMessage = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือผู้ใช้ไม่มีสิทธิ์เข้าถึงจากเครื่องนี้ (Access Denied)';

      // Extract client IP from error message if available (e.g. 'select'@'10.212.134.200')
      const match = String(error.message).match(/'([^']+)'@'([^']+)'/);
      if (match) {
        const u = match[1];
        const host = match[2];
        grantScript = `GRANT SELECT ON *.* TO '${u}'@'${host}' IDENTIFIED BY 'รหัสผ่านของคุณ';\nFLUSH PRIVILEGES;`;
      }
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      errorMessage = 'ไม่สามารถเชื่อมต่อไปยัง Host / Port ที่ระบุได้ (โปรดตรวจสอบ IP, Port 3306 หรือ Firewall)';
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      errorMessage = 'ไม่พบชื่อฐานข้อมูลที่ระบุใน MySQL Server';
    }

    const rawError = error.message || String(error);
    let debugMessage = `${errorMessage}\n\n[System Debug]:\nError Code: ${error.code || 'UNKNOWN'}\nDetails: ${rawError}`;

    if (grantScript) {
      debugMessage += `\n\n[คำแนะนำสำหรับการเปิดสิทธิ์ MySQL ใน HOSxP]:\n${grantScript}`;
    }

    return NextResponse.json({
      success: false,
      error: debugMessage,
      code: error.code,
      grantScript
    }, { status: 500 });
  }
}
