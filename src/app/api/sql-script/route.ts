import { NextResponse } from 'next/server';
import { getSqlQuery, updateSqlQuery } from '@/lib/utils/sql-reader';
import hosxpDb from '@/lib/db/hosxp';

export const dynamic = 'force-dynamic';

const REQUIRED_COLUMNS: Record<string, string[]> = {
  sync_beds: ['ward', 'ward_name', 'total_bed', 'occupied_bed', 'available_bed', 'occupancy_rate', 'export_code', 'is_icu'],
  sync_lr: ['hospcode', 'hospital_name', 'waiting_labor', 'normal_delivery', 'cesarean_delivery', 'abortion', 'not_delivery', 'total_case'],
  sync_or: ['room_available', 'operating_count', 'waiting_count', 'completed_count', 'cancelled_count', 'total_case_today']
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (!type) {
    return NextResponse.json({ error: 'Missing type parameter' }, { status: 400 });
  }

  // Prevent directory traversal attacks by allowing only specific scripts
  const allowedScripts = ['sync_beds', 'sync_lr', 'sync_or'];
  if (!allowedScripts.includes(type)) {
    return NextResponse.json({ error: 'Invalid script type' }, { status: 400 });
  }

  try {
    const sql = getSqlQuery(type);
    return NextResponse.json({ sql }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, sql } = body;

    if (!type || !sql) {
      return NextResponse.json({ error: 'Missing type or sql parameter' }, { status: 400 });
    }

    const allowedScripts = ['sync_beds', 'sync_lr', 'sync_or'];
    if (!allowedScripts.includes(type)) {
      return NextResponse.json({ error: 'Invalid script type' }, { status: 400 });
    }

    // Validation: Execute a limited query to check returned columns
    try {
      // Remove trailing semicolon and wrap in subquery
      const cleanSql = sql.trim().replace(/;+$/, '');
      const testQuery = `SELECT * FROM (${cleanSql}) AS t LIMIT 0`;
      
      const [rows, fields]: any = await hosxpDb.query(testQuery);
      
      if (!fields || !Array.isArray(fields)) {
        throw new Error('ไม่สามารถตรวจสอบโครงสร้างคอลัมน์ได้');
      }

      const returnedColumns = fields.map((f: any) => f.name.toLowerCase());
      const expectedColumns = REQUIRED_COLUMNS[type] || [];
      
      const missingColumns = expectedColumns.filter(
        col => !returnedColumns.includes(col.toLowerCase())
      );

      if (missingColumns.length > 0) {
        return NextResponse.json({ 
          error: `โครงสร้างคำสั่ง SQL ไม่ถูกต้อง ขาดคอลัมน์ที่จำเป็น: ${missingColumns.join(', ')}` 
        }, { status: 400 });
      }
    } catch (dbError: any) {
      return NextResponse.json({ 
        error: `ตรวจสอบ SQL ล้มเหลว (Syntax Error หรือ ฐานข้อมูลมีปัญหา): ${dbError.message}` 
      }, { status: 400 });
    }

    updateSqlQuery(type, sql);
    return NextResponse.json({ success: true, message: 'SQL script updated successfully' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
