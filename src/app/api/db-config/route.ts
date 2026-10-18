import { NextResponse } from 'next/server';
import { getUnifiedConfig, saveUnifiedConfig } from '@/lib/services/system-config-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { grouped } = await getUnifiedConfig();
    return NextResponse.json(grouped);
  } catch (error: any) {
    console.error('Error reading system configuration:', error);
    return NextResponse.json({ error: 'Failed to read configuration' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const config = await req.json();
    const result = await saveUnifiedConfig(config);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error saving system configuration:', error);
    return NextResponse.json({ error: error.message || 'Failed to save configuration' }, { status: 500 });
  }
}
