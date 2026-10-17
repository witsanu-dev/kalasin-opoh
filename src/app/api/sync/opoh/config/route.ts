import { NextResponse } from 'next/server';
import { getSyncConfig, updateSyncConfig, initAutoSyncScheduler, cleanUpOrphanedTimers, SAFE_MINIMUM_INTERVAL_MINUTES } from '@/lib/services/opoh-sync-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getSyncConfig();
    return NextResponse.json({
      success: true,
      config,
      minIntervalMinutes: SAFE_MINIMUM_INTERVAL_MINUTES,
    });
  } catch (error: any) {
    console.error('Error fetching OPOH sync config:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'ไม่สามารถดึงข้อมูลการตั้งค่าซิงค์ได้' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { is_auto_sync, interval_minutes, base_url, api_key } = body;

    // Strict validation: interval must NOT be less than 15 seconds (0.25 min)
    if (interval_minutes !== undefined) {
      const num = Number(interval_minutes);
      if (isNaN(num) || num < SAFE_MINIMUM_INTERVAL_MINUTES) {
        return NextResponse.json(
          {
            success: false,
            message: `ไม่อนุญาตให้ตั้งรอบเวลาต่ำกว่า 15 วินาที เพื่อความปลอดภัยและป้องกันข้อมูลโหลดซ้ำซ้อน (Data Overload Protection)`,
          },
          { status: 400 }
        );
      }
    }

    const result = await updateSyncConfig({
      is_auto_sync,
      interval_minutes,
      base_url,
      api_key,
    });

    return NextResponse.json({
      success: true,
      message: 'บันทึกการตั้งค่าระบบส่งข้อมูลอัตโนมัติสำเร็จ',
      config: result.config,
    });
  } catch (error: any) {
    console.error('Error updating OPOH sync config:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า' },
      { status: 500 }
    );
  }
}
