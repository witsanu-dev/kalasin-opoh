import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import hosxpDb from '@/lib/db/hosxp';
import localDb from '@/lib/db/local';

const ENV_PATH = path.join(process.cwd(), '.env');
const ENV_EXAMPLE_PATH = path.join(process.cwd(), '.env.example');

export async function GET() {
  try {
    let envContent = '';
    let isFromExample = false;

    // 1. Try reading .env
    try {
      envContent = await fs.readFile(ENV_PATH, 'utf-8');
    } catch (e) {
      // 2. If .env does not exist, fall back to .env.example
      try {
        envContent = await fs.readFile(ENV_EXAMPLE_PATH, 'utf-8');
        isFromExample = true;
      } catch (err) {
        // Neither exists
      }
    }

    const parseEnv = (key: string, defaultValue: string = '') => {
      const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
      if (match && match[1] !== undefined) return match[1].trim();
      return process.env[key] || defaultValue;
    };

    const config = {
      hosxp: {
        host: parseEnv('HOSXP_DB_HOST', '192.168.1.100'),
        port: parseEnv('HOSXP_DB_PORT', '3306'),
        user: parseEnv('HOSXP_DB_USER', 'select'),
        password: parseEnv('HOSXP_DB_PASSWORD', ''),
        database: parseEnv('HOSXP_DB_NAME', 'hos'),
      },
      local: {
        host: parseEnv('LOCAL_DB_HOST', '127.0.0.1'),
        port: parseEnv('LOCAL_DB_PORT', '3306'),
        user: parseEnv('LOCAL_DB_USER', 'root'),
        password: parseEnv('LOCAL_DB_PASSWORD', ''),
        database: parseEnv('LOCAL_DB_NAME', 'db_opoh'),
      },
      system: {
        hospitalCode: parseEnv('NEXT_PUBLIC_HOSPITAL_CODE', '11078'),
        hospitalName: parseEnv('NEXT_PUBLIC_HOSPITAL_NAME', 'KAMALASAI'),
        hospitalFullName: parseEnv('NEXT_PUBLIC_HOSPITAL_FULL_NAME', 'โรงพยาบาลกมลาไสย'),
        apiKey: parseEnv('API_KEY', ''),
        opohBaseUrl: parseEnv('OPOH_BASE_URL', 'https://appksn.moph.go.th/opoh/api/v1'),
        appPort: parseEnv('APP_PORT', '46'),
      },
      source: isFromExample ? 'example' : (envContent ? 'env' : 'defaults')
    };

    // Try reading backup config from localDb if .env is missing or empty
    if (!envContent || isFromExample) {
      try {
        const [rows] = await localDb.query(
          'SELECT config_key, config_value FROM system_config'
        ) as [any[], any];

        if (Array.isArray(rows) && rows.length > 0) {
          const dbMap = new Map<string, string>();
          for (const row of rows) {
            dbMap.set(row.config_key, row.config_value);
          }

          if (dbMap.has('HOSXP_DB_HOST')) config.hosxp.host = dbMap.get('HOSXP_DB_HOST')!;
          if (dbMap.has('HOSXP_DB_PORT')) config.hosxp.port = dbMap.get('HOSXP_DB_PORT')!;
          if (dbMap.has('HOSXP_DB_USER')) config.hosxp.user = dbMap.get('HOSXP_DB_USER')!;
          if (dbMap.has('HOSXP_DB_NAME')) config.hosxp.database = dbMap.get('HOSXP_DB_NAME')!;
          if (dbMap.has('LOCAL_DB_HOST')) config.local.host = dbMap.get('LOCAL_DB_HOST')!;
          if (dbMap.has('LOCAL_DB_PORT')) config.local.port = dbMap.get('LOCAL_DB_PORT')!;
          if (dbMap.has('LOCAL_DB_USER')) config.local.user = dbMap.get('LOCAL_DB_USER')!;
          if (dbMap.has('LOCAL_DB_NAME')) config.local.database = dbMap.get('LOCAL_DB_NAME')!;
          if (dbMap.has('NEXT_PUBLIC_HOSPITAL_CODE')) config.system.hospitalCode = dbMap.get('NEXT_PUBLIC_HOSPITAL_CODE')!;
          if (dbMap.has('NEXT_PUBLIC_HOSPITAL_NAME')) config.system.hospitalName = dbMap.get('NEXT_PUBLIC_HOSPITAL_NAME')!;
          if (dbMap.has('NEXT_PUBLIC_HOSPITAL_FULL_NAME')) config.system.hospitalFullName = dbMap.get('NEXT_PUBLIC_HOSPITAL_FULL_NAME')!;
          if (dbMap.has('API_KEY')) config.system.apiKey = dbMap.get('API_KEY')!;
          if (dbMap.has('OPOH_BASE_URL')) config.system.opohBaseUrl = dbMap.get('OPOH_BASE_URL')!;
          if (dbMap.has('APP_PORT')) config.system.appPort = dbMap.get('APP_PORT')!;
        }
      } catch (dbErr) {
        // Table or connection not ready, ignore
      }
    }

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
      // If .env doesn't exist, try starting from .env.example
      try {
        envContent = await fs.readFile(ENV_EXAMPLE_PATH, 'utf-8');
      } catch (err) {
        envContent = `#==========================================\n# OPOH SYNC SYSTEM CONFIGURATION\n#==========================================\n`;
      }
    }

    const updates: Record<string, string> = {};

    // 1. HOSxP config
    if (config.hosxp) {
      if (config.hosxp.host !== undefined) updates['HOSXP_DB_HOST'] = String(config.hosxp.host).trim();
      if (config.hosxp.port !== undefined) updates['HOSXP_DB_PORT'] = String(config.hosxp.port).trim();
      if (config.hosxp.user !== undefined) updates['HOSXP_DB_USER'] = String(config.hosxp.user).trim();
      if (config.hosxp.password !== undefined) updates['HOSXP_DB_PASSWORD'] = String(config.hosxp.password);
      if (config.hosxp.database !== undefined) updates['HOSXP_DB_NAME'] = String(config.hosxp.database).trim();
    }

    // 2. Local config
    if (config.local) {
      if (config.local.host !== undefined) updates['LOCAL_DB_HOST'] = String(config.local.host).trim();
      if (config.local.port !== undefined) updates['LOCAL_DB_PORT'] = String(config.local.port).trim();
      if (config.local.user !== undefined) updates['LOCAL_DB_USER'] = String(config.local.user).trim();
      if (config.local.password !== undefined) updates['LOCAL_DB_PASSWORD'] = String(config.local.password);
      if (config.local.database !== undefined) updates['LOCAL_DB_NAME'] = String(config.local.database).trim();
    }

    // 3. System config
    if (config.system) {
      if (config.system.hospitalCode !== undefined) updates['NEXT_PUBLIC_HOSPITAL_CODE'] = String(config.system.hospitalCode).trim();
      if (config.system.hospitalName !== undefined) updates['NEXT_PUBLIC_HOSPITAL_NAME'] = String(config.system.hospitalName).trim();
      if (config.system.hospitalFullName !== undefined) updates['NEXT_PUBLIC_HOSPITAL_FULL_NAME'] = String(config.system.hospitalFullName).trim();
      if (config.system.apiKey !== undefined) {
        updates['API_KEY'] = String(config.system.apiKey).trim();
        if (!envContent.includes('API_KEY_CREATED_AT=')) {
          updates['API_KEY_CREATED_AT'] = new Date().toISOString();
        }
      }
      if (config.system.opohBaseUrl !== undefined) updates['OPOH_BASE_URL'] = String(config.system.opohBaseUrl).trim();
      if (config.system.appPort !== undefined) updates['APP_PORT'] = String(config.system.appPort).trim();
    }

    // Apply updates to envContent
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
      // Immediate In-Memory Hot-Reload of Node's process.env
      process.env[key] = value;
    }

    // Clean up excessive blank lines
    envContent = envContent.replace(/\n{3,}/g, '\n\n').trim() + '\n';

    // Persist to .env
    await fs.writeFile(ENV_PATH, envContent, 'utf-8');

    // Hot-reload dynamic connection pools in memory
    if (config.hosxp) {
      await hosxpDb.updateConfig({
        host: updates['HOSXP_DB_HOST'] || process.env.HOSXP_DB_HOST,
        port: Number(updates['HOSXP_DB_PORT']) || 3306,
        user: updates['HOSXP_DB_USER'] || process.env.HOSXP_DB_USER,
        password: updates['HOSXP_DB_PASSWORD'] !== undefined ? updates['HOSXP_DB_PASSWORD'] : process.env.HOSXP_DB_PASSWORD,
        database: updates['HOSXP_DB_NAME'] || process.env.HOSXP_DB_NAME,
      });
    }

    if (config.local) {
      await localDb.updateConfig({
        host: updates['LOCAL_DB_HOST'] || process.env.LOCAL_DB_HOST,
        port: Number(updates['LOCAL_DB_PORT']) || 3306,
        user: updates['LOCAL_DB_USER'] || process.env.LOCAL_DB_USER,
        password: updates['LOCAL_DB_PASSWORD'] !== undefined ? updates['LOCAL_DB_PASSWORD'] : process.env.LOCAL_DB_PASSWORD,
        database: updates['LOCAL_DB_NAME'] || process.env.LOCAL_DB_NAME,
      });
    }

    // Dual-persistence: Attempt to backup config into Local DB
    try {
      await localDb.query(`
        CREATE TABLE IF NOT EXISTS system_config (
          config_key VARCHAR(100) PRIMARY KEY,
          config_value TEXT,
          updated_at DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      for (const [k, v] of Object.entries(updates)) {
        // Do not store passwords in plaintext table if local DB has open access
        if (k.includes('PASSWORD')) continue;
        await localDb.query(
          `INSERT INTO system_config (config_key, config_value, updated_at)
           VALUES (?, ?, NOW())
           ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = NOW()`,
          [k, v]
        );
      }

      // Sync to api_keys table if exists
      if (updates['API_KEY'] && updates['NEXT_PUBLIC_HOSPITAL_CODE']) {
        try {
          await localDb.query(
            `INSERT INTO api_keys (hospital_code, api_key, is_active, created_at, updated_at)
             VALUES (?, ?, 1, NOW(), NOW())
             ON DUPLICATE KEY UPDATE api_key = VALUES(api_key), is_active = 1, updated_at = NOW()`,
            [updates['NEXT_PUBLIC_HOSPITAL_CODE'], updates['API_KEY']]
          );
        } catch (apiErr) {
          // Table might not exist yet
        }
      }

      // Sync to hospitals table if exists
      if (updates['NEXT_PUBLIC_HOSPITAL_CODE'] && updates['NEXT_PUBLIC_HOSPITAL_FULL_NAME']) {
        try {
          await localDb.query(
            `INSERT INTO hospitals (hospital_code, hospital_name, amphur, created_at, updated_at)
             VALUES (?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE hospital_name = VALUES(hospital_name), updated_at = NOW()`,
            [updates['NEXT_PUBLIC_HOSPITAL_CODE'], updates['NEXT_PUBLIC_HOSPITAL_FULL_NAME'], updates['NEXT_PUBLIC_HOSPITAL_NAME'] || '']
          );
        } catch (hospErr) {
          // Table might not exist yet
        }
      }
    } catch (dbErr) {
      console.warn('Local database backup skipped (Local DB may not be running yet):', dbErr);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'บันทึกการตั้งค่าลง .env และเชื่อมโยงฐานข้อมูลสำเร็จ' 
    });
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}
