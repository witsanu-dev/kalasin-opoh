import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.LOCAL_DB_HOST || '127.0.0.1',
    user: process.env.LOCAL_DB_USER || 'root',
    password: process.env.LOCAL_DB_PASSWORD || '',
    database: process.env.LOCAL_DB_NAME || 'db_opoh',
  });

  const sql = `
    CREATE TABLE IF NOT EXISTS waiting_or_summary (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hospital_code VARCHAR(10) NOT NULL UNIQUE,
        hospital_name VARCHAR(100) NOT NULL,
        total_cases INT DEFAULT 0,
        general_surgery INT DEFAULT 0,
        ortho_surgery INT DEFAULT 0,
        eye_surgery INT DEFAULT 0,
        obgyn_surgery INT DEFAULT 0,
        urgency_level_desc VARCHAR(255) DEFAULT NULL,
        last_sync_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await connection.query(sql);
  console.log("Table waiting_or_summary created.");
  await connection.end();
}

run().catch(console.error);
