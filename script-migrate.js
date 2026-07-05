const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.LOCAL_DB_HOST || '127.0.0.1',
    port: Number(process.env.LOCAL_DB_PORT) || 3306,
    user: process.env.LOCAL_DB_USER || 'root',
    password: process.env.LOCAL_DB_PASSWORD || 'password',
    database: process.env.LOCAL_DB_NAME || 'db_opoh',
  });

  try {
    console.log('Running migration...');
    await pool.query('ALTER TABLE bed_management_summary ADD COLUMN is_icu TINYINT(1) DEFAULT 0');
    console.log('Migration successful');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column is_icu already exists.');
    } else {
      console.error('Migration failed:', error);
    }
  } finally {
    pool.end();
  }
}

migrate();
