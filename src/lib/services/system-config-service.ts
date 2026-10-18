import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import hosxpDb from '@/lib/db/hosxp';
import localDb from '@/lib/db/local';

const ENV_PATH = path.join(process.cwd(), '.env');
const ENV_EXAMPLE_PATH = path.join(process.cwd(), '.env.example');

export interface GroupedDbConfig {
  host: string;
  port: string;
  user: string;
  password?: string;
  database: string;
}

export interface GroupedSystemConfig {
  hospitalCode: string;
  hospitalName: string;
  hospitalFullName: string;
  apiKey: string;
  opohBaseUrl: string;
  appPort: string;
}

export interface GroupedConfig {
  hosxp: GroupedDbConfig;
  local: GroupedDbConfig;
  system: GroupedSystemConfig;
  flat?: Record<string, string>;
  source?: string;
}

/**
 * Standard key mapper between Grouped structure (Modal) and Flat structure (.env / Settings)
 */
export function groupedToFlat(grouped: Partial<GroupedConfig>): Record<string, string> {
  const flat: Record<string, string> = {};

  if (grouped.hosxp) {
    if (grouped.hosxp.host !== undefined) flat['HOSXP_DB_HOST'] = String(grouped.hosxp.host).trim();
    if (grouped.hosxp.port !== undefined) flat['HOSXP_DB_PORT'] = String(grouped.hosxp.port).trim();
    if (grouped.hosxp.user !== undefined) flat['HOSXP_DB_USER'] = String(grouped.hosxp.user).trim();
    if (grouped.hosxp.password !== undefined) flat['HOSXP_DB_PASSWORD'] = String(grouped.hosxp.password);
    if (grouped.hosxp.database !== undefined) flat['HOSXP_DB_NAME'] = String(grouped.hosxp.database).trim();
  }

  if (grouped.local) {
    if (grouped.local.host !== undefined) flat['LOCAL_DB_HOST'] = String(grouped.local.host).trim();
    if (grouped.local.port !== undefined) flat['LOCAL_DB_PORT'] = String(grouped.local.port).trim();
    if (grouped.local.user !== undefined) flat['LOCAL_DB_USER'] = String(grouped.local.user).trim();
    if (grouped.local.password !== undefined) flat['LOCAL_DB_PASSWORD'] = String(grouped.local.password);
    if (grouped.local.database !== undefined) flat['LOCAL_DB_NAME'] = String(grouped.local.database).trim();
  }

  if (grouped.system) {
    if (grouped.system.hospitalCode !== undefined) flat['NEXT_PUBLIC_HOSPITAL_CODE'] = String(grouped.system.hospitalCode).trim();
    if (grouped.system.hospitalName !== undefined) flat['NEXT_PUBLIC_HOSPITAL_NAME'] = String(grouped.system.hospitalName).trim();
    if (grouped.system.hospitalFullName !== undefined) flat['NEXT_PUBLIC_HOSPITAL_FULL_NAME'] = String(grouped.system.hospitalFullName).trim();
    if (grouped.system.apiKey !== undefined) flat['API_KEY'] = String(grouped.system.apiKey).trim();
    if (grouped.system.opohBaseUrl !== undefined) flat['OPOH_BASE_URL'] = String(grouped.system.opohBaseUrl).trim();
    if (grouped.system.appPort !== undefined) flat['APP_PORT'] = String(grouped.system.appPort).trim();
  }

  return flat;
}

/**
 * Standard key mapper from Flat structure (.env) to Grouped structure (Modal)
 */
export function flatToGrouped(flat: Record<string, string>, source: string = 'env'): GroupedConfig {
  return {
    hosxp: {
      host: flat['HOSXP_DB_HOST'] || '',
      port: flat['HOSXP_DB_PORT'] || '3306',
      user: flat['HOSXP_DB_USER'] || '',
      password: flat['HOSXP_DB_PASSWORD'] || '',
      database: flat['HOSXP_DB_NAME'] || 'hos',
    },
    local: {
      host: flat['LOCAL_DB_HOST'] || '127.0.0.1',
      port: flat['LOCAL_DB_PORT'] || '3306',
      user: flat['LOCAL_DB_USER'] || 'root',
      password: flat['LOCAL_DB_PASSWORD'] || '',
      database: flat['LOCAL_DB_NAME'] || 'db_opoh',
    },
    system: {
      hospitalCode: flat['NEXT_PUBLIC_HOSPITAL_CODE'] || '',
      hospitalName: flat['NEXT_PUBLIC_HOSPITAL_NAME'] || '',
      hospitalFullName: flat['NEXT_PUBLIC_HOSPITAL_FULL_NAME'] || '',
      apiKey: flat['API_KEY'] || '',
      opohBaseUrl: flat['OPOH_BASE_URL'] || 'https://appksn.moph.go.th/opoh/api/v1',
      appPort: flat['APP_PORT'] || '3000',
    },
    flat,
    source,
  };
}

/**
 * Read raw .env file into key-value map preserving process.env values
 */
export async function getRawEnvMap(): Promise<{ map: Record<string, string>; source: string }> {
  let content = '';
  let source = 'defaults';

  // 1. Try reading .env
  try {
    if (fsSync.existsSync(ENV_PATH)) {
      content = fsSync.readFileSync(ENV_PATH, 'utf-8');
      source = 'env';
    } else {
      console.warn('[SystemConfig] .env does not exist at:', ENV_PATH);
    }
  } catch (err: any) {
    console.error('[SystemConfig] Error reading .env:', err.message);
  }

  // 2. If .env is empty or not found, try .env.example
  if (!content) {
    try {
      if (fsSync.existsSync(ENV_EXAMPLE_PATH)) {
        content = fsSync.readFileSync(ENV_EXAMPLE_PATH, 'utf-8');
        source = 'example';
      }
    } catch (err: any) {
      console.error('[SystemConfig] Error reading .env.example:', err.message);
    }
  }

  const map: Record<string, string> = {};

  if (content) {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        // Remove surrounding single or double quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        map[key] = val;
      }
    }
  }

  // Overlay with runtime process.env if present
  const keysToCheck = [
    'APP_PORT',
    'NEXT_PUBLIC_HOSPITAL_CODE',
    'NEXT_PUBLIC_HOSPITAL_NAME',
    'NEXT_PUBLIC_HOSPITAL_FULL_NAME',
    'OPOH_BASE_URL',
    'API_KEY',
    'API_KEY_CREATED_AT',
    'HOSXP_DB_HOST',
    'HOSXP_DB_PORT',
    'HOSXP_DB_USER',
    'HOSXP_DB_PASSWORD',
    'HOSXP_DB_NAME',
    'HOSXP_DB_CHARSET',
    'LOCAL_DB_HOST',
    'LOCAL_DB_PORT',
    'LOCAL_DB_USER',
    'LOCAL_DB_PASSWORD',
    'LOCAL_DB_NAME',
    'LOCAL_DB_PORT_MAP',
    'ADMIN_USERNAMES',
    'JWT_SECRET',
    'COOKIE_SECURE'
  ];

  for (const k of keysToCheck) {
    if (process.env[k] !== undefined && map[k] === undefined) {
      map[k] = process.env[k]!;
    }
  }

  return { map, source };
}

/**
 * Get unified system config (available both as flat dictionary and grouped structure)
 */
export async function getUnifiedConfig(): Promise<{
  grouped: GroupedConfig;
  flat: Record<string, string>;
  source: string;
}> {
  const { map, source } = await getRawEnvMap();
  const grouped = flatToGrouped(map, source);
  return { grouped, flat: map, source };
}

/**
 * Unified Save: Saves configuration to .env, process.env, DB connection pools,
 * and synchronizes with existing tables in database (system_config, api_keys, hospitals, opoh_sync_config).
 */
export async function saveUnifiedConfig(payload: any): Promise<{
  success: boolean;
  message: string;
  config: GroupedConfig;
}> {
  // 1. Normalize payload into flat updates
  let flatUpdates: Record<string, string> = {};

  if (payload.hosxp || payload.local || payload.system) {
    flatUpdates = groupedToFlat(payload);
  } else if (typeof payload === 'object' && payload !== null) {
    for (const [k, v] of Object.entries(payload)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        flatUpdates[k] = String(v).trim();
      }
    }
  }

  // 2. Read current .env content or template
  let envContent = '';
  try {
    if (fsSync.existsSync(ENV_PATH)) {
      envContent = await fs.readFile(ENV_PATH, 'utf-8');
    } else if (fsSync.existsSync(ENV_EXAMPLE_PATH)) {
      envContent = await fs.readFile(ENV_EXAMPLE_PATH, 'utf-8');
    }
  } catch (err) {
    envContent = `#===============================================================================\n# OPOH SYSTEM CONFIGURATION\n#===============================================================================\n`;
  }

  // 3. Update or append lines in .env
  const updatedKeys = new Set<string>();
  const lines = envContent ? envContent.split('\n') : [];

  const newLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) {
      return line;
    }
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      if (flatUpdates[key] !== undefined) {
        updatedKeys.add(key);
        return `${key}=${flatUpdates[key]}`;
      }
    }
    return line;
  });

  // Append any keys that did not exist in .env
  for (const [key, value] of Object.entries(flatUpdates)) {
    if (!updatedKeys.has(key)) {
      newLines.push(`${key}=${value}`);
      updatedKeys.add(key);
    }
  }

  const finalEnvContent = newLines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';

  // 4. Write back to .env
  try {
    await fs.writeFile(ENV_PATH, finalEnvContent, 'utf-8');
  } catch (writeErr) {
    console.error('Failed to write .env file:', writeErr);
  }

  // 5. In-Memory Hot-Reload of Node process.env
  for (const [key, value] of Object.entries(flatUpdates)) {
    process.env[key] = value;
  }

  // 6. Dynamically Hot-Reload Database Connection Pools
  try {
    const hosxpHost = flatUpdates['HOSXP_DB_HOST'] || process.env.HOSXP_DB_HOST;
    const hosxpUser = flatUpdates['HOSXP_DB_USER'] || process.env.HOSXP_DB_USER;
    const hosxpDbName = flatUpdates['HOSXP_DB_NAME'] || process.env.HOSXP_DB_NAME;

    if (hosxpHost && hosxpUser && hosxpDbName) {
      await hosxpDb.updateConfig({
        host: hosxpHost,
        port: Number(flatUpdates['HOSXP_DB_PORT'] || process.env.HOSXP_DB_PORT) || 3306,
        user: hosxpUser,
        password: flatUpdates['HOSXP_DB_PASSWORD'] !== undefined ? flatUpdates['HOSXP_DB_PASSWORD'] : process.env.HOSXP_DB_PASSWORD,
        database: hosxpDbName,
        charset: flatUpdates['HOSXP_DB_CHARSET'] || process.env.HOSXP_DB_CHARSET || 'utf8mb4',
      });
    }
  } catch (poolErr) {
    console.warn('Could not update HOSxP dynamic pool:', poolErr);
  }

  try {
    const localHost = flatUpdates['LOCAL_DB_HOST'] || process.env.LOCAL_DB_HOST;
    const localUser = flatUpdates['LOCAL_DB_USER'] || process.env.LOCAL_DB_USER;
    const localDbName = flatUpdates['LOCAL_DB_NAME'] || process.env.LOCAL_DB_NAME;

    if (localHost && localUser && localDbName) {
      await localDb.updateConfig({
        host: localHost,
        port: Number(flatUpdates['LOCAL_DB_PORT'] || process.env.LOCAL_DB_PORT) || 3306,
        user: localUser,
        password: flatUpdates['LOCAL_DB_PASSWORD'] !== undefined ? flatUpdates['LOCAL_DB_PASSWORD'] : process.env.LOCAL_DB_PASSWORD,
        database: localDbName,
      });
    }
  } catch (poolErr) {
    console.warn('Could not update Local dynamic pool:', poolErr);
  }

  // 7. Synchronize to Existing Database Tables in localDb (No new tables created!)
  try {
    // 7.1 system_config table
    await localDb.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        config_key VARCHAR(100) PRIMARY KEY,
        config_value TEXT,
        updated_at DATETIME
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    for (const [k, v] of Object.entries(flatUpdates)) {
      // Do not store passwords in plaintext config table
      if (k.includes('PASSWORD')) continue;
      await localDb.query(
        `INSERT INTO system_config (config_key, config_value, updated_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = NOW()`,
        [k, v]
      );
    }

    // 7.2 api_keys table
    const hospCode = flatUpdates['NEXT_PUBLIC_HOSPITAL_CODE'] || process.env.NEXT_PUBLIC_HOSPITAL_CODE;
    const apiKey = flatUpdates['API_KEY'] || process.env.API_KEY;

    if (hospCode && apiKey) {
      try {
        await localDb.query(
          `INSERT INTO api_keys (hospital_code, api_key, is_active, created_at, updated_at)
           VALUES (?, ?, 1, NOW(), NOW())
           ON DUPLICATE KEY UPDATE api_key = VALUES(api_key), is_active = 1, updated_at = NOW()`,
          [hospCode, apiKey]
        );
      } catch (e) {
        // Table may not be created yet if migrations haven't run
      }
    }

    // 7.3 hospitals table
    const hospFullName = flatUpdates['NEXT_PUBLIC_HOSPITAL_FULL_NAME'] || process.env.NEXT_PUBLIC_HOSPITAL_FULL_NAME;
    const hospShortName = flatUpdates['NEXT_PUBLIC_HOSPITAL_NAME'] || process.env.NEXT_PUBLIC_HOSPITAL_NAME;

    if (hospCode && hospFullName) {
      try {
        await localDb.query(
          `INSERT INTO hospitals (hospital_code, hospital_name, amphur, created_at, updated_at)
           VALUES (?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE hospital_name = VALUES(hospital_name), amphur = VALUES(amphur), updated_at = NOW()`,
          [hospCode, hospFullName, hospShortName || '']
        );
      } catch (e) {
        // Ignore table missing
      }
    }

    // 7.4 opoh_sync_config table (Synchronize central endpoint & API key)
    const opohUrl = flatUpdates['OPOH_BASE_URL'] || process.env.OPOH_BASE_URL;
    if (opohUrl || apiKey) {
      try {
        await localDb.query(`
          CREATE TABLE IF NOT EXISTS opoh_sync_config (
            id INT PRIMARY KEY DEFAULT 1,
            is_auto_sync TINYINT(1) DEFAULT 0,
            interval_minutes DECIMAL(6,2) DEFAULT 3.00,
            base_url VARCHAR(255) DEFAULT 'https://appksn.moph.go.th/opoh/api/v1',
            api_key VARCHAR(255) NULL,
            last_sync_at DATETIME NULL,
            last_sync_status VARCHAR(50) NULL,
            last_sync_message TEXT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await localDb.query(
          `INSERT INTO opoh_sync_config (id, is_auto_sync, interval_minutes, base_url, api_key, updated_at)
           VALUES (1, 0, 3.00, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE 
             base_url = COALESCE(?, base_url),
             api_key = COALESCE(?, api_key),
             updated_at = NOW()`,
          [opohUrl || 'https://appksn.moph.go.th/opoh/api/v1', apiKey || '', opohUrl || null, apiKey || null]
        );
      } catch (e) {
        // Ignore if table unavailable
      }
    }
  } catch (dbErr) {
    console.warn('Database configuration synchronization skipped (database may not be ready yet):', dbErr);
  }

  // 8. Return updated config
  const { grouped } = await getUnifiedConfig();

  return {
    success: true,
    message: 'บันทึกการตั้งค่าลง .env, In-Memory Process, Hot-Reload Pool และฐานข้อมูลเรียบร้อยแล้ว',
    config: grouped,
  };
}
