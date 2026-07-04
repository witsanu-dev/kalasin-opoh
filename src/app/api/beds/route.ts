import { NextResponse } from 'next/server';
import localDb from '@/lib/db/local';

export const dynamic = 'force-dynamic'; // Always fetch fresh data

export async function GET() {
  try {
    const query = `
      SELECT 
        ward_code,
        ward_name,
        total_bed,
        actual_bed,
        occupied_bed,
        IFNULL(actual_bed, total_bed) AS active_total_bed,
        (IFNULL(actual_bed, total_bed) - occupied_bed) AS available_bed,
        ROUND((occupied_bed * 100) / NULLIF(IFNULL(actual_bed, total_bed), 0), 2) AS occupancy_rate,
        export_code,
        last_sync_at
      FROM bed_management_summary
      ORDER BY ward_name ASC
    `;

    const [rows]: any = await localDb.query(query);

    return NextResponse.json({
      success: true,
      data: rows,
      total_count: rows.length
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching local beds data:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch bed data from local db',
      error: error.message
    }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { ward_code, actual_bed } = body;

    if (!ward_code) {
      return NextResponse.json({ success: false, message: 'ward_code is required' }, { status: 400 });
    }

    // actual_bed can be null (to clear the override) or an integer
    const bedValue = actual_bed === null || actual_bed === '' ? null : parseInt(actual_bed, 10);

    const updateQuery = `
      UPDATE bed_management_summary 
      SET actual_bed = ? 
      WHERE ward_code = ?
    `;

    await localDb.query(updateQuery, [bedValue, ward_code]);

    return NextResponse.json({ 
      success: true, 
      message: 'Updated actual_bed successfully' 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error updating actual_bed:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to update actual_bed', 
      error: error.message 
    }, { status: 500 });
  }
}
