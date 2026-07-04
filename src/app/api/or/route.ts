import { NextResponse } from 'next/server';
import localDb from '@/lib/db/local';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const query = `
      SELECT 
        hospital_code,
        hospital_name,
        room_available_str,
        operating_count,
        waiting_count,
        completed_count,
        cancelled_count,
        total_case_today,
        last_sync_at
      FROM or_management_summary
      LIMIT 1
    `;

    const [rows]: any = await localDb.query(query);

    return NextResponse.json({
      success: true,
      data: rows.length > 0 ? rows[0] : null
    });

  } catch (error: any) {
    console.error('Error fetching OR data:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch OR data',
      error: error.message
    }, { status: 500 });
  }
}
