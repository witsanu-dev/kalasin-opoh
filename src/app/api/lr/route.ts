import { NextResponse } from 'next/server';
import localDb from '@/lib/db/local';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const query = `
      SELECT *
      FROM lr_management_summary
      ORDER BY total_case DESC
    `;

    const [rows]: any = await localDb.query(query);

    return NextResponse.json({
      success: true,
      data: rows
    });

  } catch (error: any) {
    console.error('Error fetching LR data:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch LR data',
      error: error.message
    }, { status: 500 });
  }
}
