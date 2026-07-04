import { NextResponse } from 'next/server';
import localDb from '@/lib/db/local';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [rows] = await localDb.query(`
      SELECT * 
      FROM waiting_or_summary
      ORDER BY total_cases DESC
    `);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching surgical queue:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
