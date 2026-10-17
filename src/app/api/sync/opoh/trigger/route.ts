import { NextResponse } from 'next/server';
import { executeOpohSync } from '@/lib/services/opoh-sync-service';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await executeOpohSync('MANUAL');
    return NextResponse.json({
      success: result.success,
      message: result.message,
      results: result.results,
      durationMs: result.durationMs,
    });
  } catch (error: any) {
    console.error('Error triggering manual OPOH sync:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'เกิดข้อผิดพลาดในการสั่งส่งข้อมูล' },
      { status: 500 }
    );
  }
}
