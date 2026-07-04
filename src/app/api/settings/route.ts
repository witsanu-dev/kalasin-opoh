import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ENV_PATH = path.join(process.cwd(), '.env');

// Parse current .env
function getEnvData() {
  if (!fs.existsSync(ENV_PATH)) return {};
  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  const env: Record<string, string> = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^['"]|['"]$/g, ''); // remove quotes
      env[key] = val;
    }
  });
  return env;
}

export async function GET() {
  try {
    const env = getEnvData();
    // Return relevant variables, mask passwords? 
    // We shouldn't necessarily mask them here if the admin is meant to view/edit them.
    // It's a local tool, so sending the clear text is okay for the form.
    return NextResponse.json({ success: true, data: env });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const updates = await req.json(); // Record<string, string>
    
    // Read current content to preserve comments and structure
    let content = '';
    if (fs.existsSync(ENV_PATH)) {
      content = fs.readFileSync(ENV_PATH, 'utf-8');
    }

    // Process updates
    const lines = content.split('\n');
    const updatedKeys = new Set<string>();

    const newLines = lines.map(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        if (updates[key] !== undefined) {
          updatedKeys.add(key);
          return `${key}=${updates[key]}`;
        }
      }
      return line;
    });

    // Append any new keys that weren't in the file
    for (const [key, value] of Object.entries(updates)) {
      if (!updatedKeys.has(key)) {
        newLines.push(`${key}=${value as string}`);
      }
    }

    fs.writeFileSync(ENV_PATH, newLines.join('\n'));

    return NextResponse.json({ success: true, message: 'บันทึกการตั้งค่าสำเร็จ (กรุณา Restart Server เพื่อให้การตั้งค่ามีผล)' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
