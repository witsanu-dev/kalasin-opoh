import { NextResponse } from 'next/server';
import localDb from '@/lib/db/local';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const query = `
      SELECT 
        id,
        ward_code,
        ward_name,
        total_bed,
        actual_bed,
        occupied_bed,
        available_bed,
        occupancy_rate,
        export_code,
        last_sync_at
      FROM bed_management_summary
      WHERE ward_name LIKE '%ICU%' 
         OR ward_code = 'ICU' 
         OR export_code = 'ICU'
      ORDER BY ward_name ASC
    `;

    const [rows]: any = await localDb.query(query);

    return NextResponse.json({
      success: true,
      data: rows
    });

  } catch (error: any) {
    console.error('Error fetching ICU data:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch ICU data',
      error: error.message
    }, { status: 500 });
  }
}
