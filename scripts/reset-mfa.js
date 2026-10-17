#!/usr/bin/env node

/**
 * Emergency CLI tool to reset MFA for a user
 * Usage:
 *   node scripts/reset-mfa.js <username>
 * Example:
 *   node scripts/reset-mfa.js admin
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Parse .env file
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

async function main() {
  const targetUsername = process.argv[2];

  if (!targetUsername) {
    console.log('\n❌ กรุณาระบุชื่อผู้ใช้งานที่ต้องการรีเซ็ต MFA');
    console.log('   รูปแบบการใช้งาน: node scripts/reset-mfa.js <username>');
    console.log('   ตัวอย่าง: node scripts/reset-mfa.js admin\n');
    process.exit(1);
  }

  const env = loadEnv();
  const dbConfig = {
    host: env.LOCAL_DB_HOST || '127.0.0.1',
    port: Number(env.LOCAL_DB_PORT) || 3306,
    user: env.LOCAL_DB_USER || 'root',
    password: env.LOCAL_DB_PASSWORD || 'password',
    database: env.LOCAL_DB_NAME || 'db_opoh',
  };

  console.log(`\n⏳ กำลังเชื่อมต่อฐานข้อมูล ${dbConfig.database}@${dbConfig.host}...`);

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');

    const cleanUser = targetUsername.trim();

    // Check if user exists in user_mfa
    const [rows] = await connection.query(
      'SELECT id, username, is_enabled FROM user_mfa WHERE username = ? LIMIT 1',
      [cleanUser]
    );

    if (!rows || rows.length === 0) {
      console.log(`⚠️ ไม่พบข้อมูล MFA ของผู้ใช้งาน "${cleanUser}" ในตาราง user_mfa`);
      process.exit(0);
    }

    const record = rows[0];
    console.log(`📌 พบผู้ใช้งาน "${cleanUser}" (สถานะเดิม: ${record.is_enabled ? 'เปิดใช้งาน' : 'ยังไม่เปิดใช้งาน'})`);

    // Reset MFA
    await connection.query(
      'UPDATE user_mfa SET is_enabled = 0, secret = "", recovery_codes = NULL, enabled_at = NULL WHERE username = ?',
      [cleanUser]
    );

    console.log(`\n🎉 [SUCCESS] รีเซ็ต MFA ของผู้ใช้งาน "${cleanUser}" สำเร็จเรียบร้อย!`);
    console.log(`   ผู้ใช้งานสามารถเข้าสู่ระบบด้วยรหัสผ่านปกติได้ทันที\n`);
  } catch (err) {
    console.error('❌ เกิดข้อผิดพลาด:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

main();
