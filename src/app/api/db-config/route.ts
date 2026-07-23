import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import hosxpDb from '@/lib/db/hosxp';
import localDb from '@/lib/db/local';

const ENV_PATH = path.join(process.cwd(), '.env');

export async function GET() {
  try {
    // Attempt to read from .env if it exists, otherwise fall back to process.env
    let envContent = '';
    try {
      envContent = await fs.readFile(ENV_PATH, 'utf-8');
    } catch (e) {
      // .env might not exist, that's fine
    }

    const parseEnv = (key: string, defaultValue: string) => {
      const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
      if (match) return match[1].trim();
      return process.env[key] || defaultValue;
    };

    const config = {
      hosxp: {
        host: parseEnv('HOSXP_DB_HOST', '10.250.100.200'),
        port: parseEnv('HOSXP_DB_PORT', '3306'),
        user: parseEnv('HOSXP_DB_USER', 'select'),
        password: parseEnv('HOSXP_DB_PASSWORD', 'select@11078'),
        database: parseEnv('HOSXP_DB_NAME', 'hosxp'),
      },
      local: {
        host: parseEnv('LOCAL_DB_HOST', '127.0.0.1'),
        port: parseEnv('LOCAL_DB_PORT', '3306'),
        user: parseEnv('LOCAL_DB_USER', 'root'),
        password: parseEnv('LOCAL_DB_PASSWORD', 'password'),
        database: parseEnv('LOCAL_DB_NAME', 'db_opoh'),
      },
      system: {
        hospitalName: parseEnv('NEXT_PUBLIC_HOSPITAL_NAME', 'KALASIN'),
        hospitalCode: parseEnv('NEXT_PUBLIC_HOSPITAL_CODE', '11078'),
        hospitalFullName: parseEnv('NEXT_PUBLIC_HOSPITAL_FULL_NAME', 'โรงพยาบาลกมลาไสย'),
      },
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error reading config:', error);
    return NextResponse.json({ error: 'Failed to read configuration' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const config = await req.json();

    let envContent = '';
    try {
      envContent = await fs.readFile(ENV_PATH, 'utf-8');
    } catch (e) {
      // .env might not exist
    }

    const updateEnv = (key: string, value: string) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    };

    // Update HOSxP config
    if (config.hosxp) {
      updateEnv('HOSXP_DB_HOST', config.hosxp.host);
      updateEnv('HOSXP_DB_PORT', config.hosxp.port);
      updateEnv('HOSXP_DB_USER', config.hosxp.user);
      updateEnv('HOSXP_DB_PASSWORD', config.hosxp.password);
      updateEnv('HOSXP_DB_NAME', config.hosxp.database);
    }

    // Update Local config
    if (config.local) {
      updateEnv('LOCAL_DB_HOST', config.local.host);
      updateEnv('LOCAL_DB_PORT', config.local.port);
      updateEnv('LOCAL_DB_USER', config.local.user);
      updateEnv('LOCAL_DB_PASSWORD', config.local.password);
      updateEnv('LOCAL_DB_NAME', config.local.database);
    }

    // Update System config
    if (config.system) {
      updateEnv('NEXT_PUBLIC_HOSPITAL_NAME', config.system.hospitalName);
      updateEnv('NEXT_PUBLIC_HOSPITAL_CODE', config.system.hospitalCode);
      updateEnv('NEXT_PUBLIC_HOSPITAL_FULL_NAME', config.system.hospitalFullName);
    }

    // Clean up empty lines
    envContent = envContent.replace(/^\s*[\r\n]/gm, '');

    await fs.writeFile(ENV_PATH, envContent, 'utf-8');

    // 🌟 Hot-Reload Database Pools dynamically without restarting PM2/Node 🌟
    if (config.hosxp) await hosxpDb.updateConfig(config.hosxp);
    if (config.local) await localDb.updateConfig(config.local);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}
