/**
 * Test script for opoh-sync tables and config
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^['"]|['"]$/g, '');
      env[key] = val;
    }
  });
  return env;
}

async function test() {
  const env = loadEnv();
  const dbConfig = {
    host: env.LOCAL_DB_HOST || '127.0.0.1',
    port: Number(env.LOCAL_DB_PORT) || 3306,
    user: env.LOCAL_DB_USER || 'root',
    password: env.LOCAL_DB_PASSWORD || 'password',
    database: env.LOCAL_DB_NAME || 'db_opoh',
  };

  const connection = await mysql.createConnection(dbConfig);
  console.log('Connected to MySQL:', dbConfig.database);

  // Check tables
  const [tables] = await connection.query(`
    SHOW TABLES LIKE 'opoh_sync%'
  `);
  console.log('Existing opoh_sync tables:', tables);

  // If not exists, create them
  await connection.query(`
    CREATE TABLE IF NOT EXISTS opoh_sync_config (
      id INT PRIMARY KEY DEFAULT 1,
      is_auto_sync TINYINT(1) DEFAULT 1,
      interval_minutes INT DEFAULT 3,
      base_url VARCHAR(255) DEFAULT 'https://appksn.moph.go.th/opoh/api/v1',
      api_key VARCHAR(255) NULL,
      last_sync_at DATETIME NULL,
      last_sync_status VARCHAR(50) NULL,
      last_sync_message TEXT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    INSERT IGNORE INTO opoh_sync_config (id, is_auto_sync, interval_minutes, base_url)
    VALUES (1, 1, 3, 'https://appksn.moph.go.th/opoh/api/v1')
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS opoh_sync_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sync_type VARCHAR(20) NOT NULL,
      endpoint VARCHAR(100) NOT NULL,
      status_code INT NULL,
      is_success TINYINT(1) DEFAULT 0,
      records_count INT DEFAULT 0,
      response_data TEXT NULL,
      error_message TEXT NULL,
      duration_ms INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_created (created_at DESC),
      INDEX idx_endpoint (endpoint)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [configRows] = await connection.query('SELECT * FROM opoh_sync_config WHERE id = 1');
  console.log('opoh_sync_config row:', configRows[0]);

  await connection.end();
  console.log('Test completed successfully.');
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
