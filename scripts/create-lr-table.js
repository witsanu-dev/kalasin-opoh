import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = mysql.createPool({
  host: process.env.LOCAL_DB_HOST || '127.0.0.1',
  port: Number(process.env.LOCAL_DB_PORT) || 3306,
  user: process.env.LOCAL_DB_USER || 'root',
  password: process.env.LOCAL_DB_PASSWORD || 'password',
  database: process.env.LOCAL_DB_NAME || 'db_opoh',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function createLrTable() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS lr_management_summary (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hospital_code VARCHAR(50) UNIQUE NOT NULL,
        hospital_name VARCHAR(255),
        waiting_labor INT DEFAULT 0,
        normal_delivery INT DEFAULT 0,
        cesarean_delivery INT DEFAULT 0,
        abortion INT DEFAULT 0,
        not_delivery INT DEFAULT 0,
        total_case INT DEFAULT 0,
        last_sync_at DATETIME
      );
    `;
    
    await pool.query(query);
    console.log('✅ lr_management_summary table created successfully');
  } catch (error) {
    console.error('❌ Error creating table:', error);
  } finally {
    await pool.end();
  }
}

createLrTable();
