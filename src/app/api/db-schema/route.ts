import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download');

    // The file is located at /database/db_opoh.sql
    const filePath = path.join(process.cwd(), 'database', 'db_opoh.sql');
    const fileContent = await fs.readFile(filePath, 'utf-8');

    if (download === 'true') {
      return new NextResponse(fileContent, {
        headers: {
          'Content-Type': 'application/sql',
          'Content-Disposition': 'attachment; filename="db_opoh.sql"',
        },
      });
    }

    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Error reading db_opoh.sql:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
