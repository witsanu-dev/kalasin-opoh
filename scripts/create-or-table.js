import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.LOCAL_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.LOCAL_DB_PORT || '3306'),
    user: process.env.LOCAL_DB_USER || 'root',
    password: process.env.LOCAL_DB_PASSWORD || '',
    database: process.env.LOCAL_DB_NAME || 'db_opoh',
  });

  console.log('Connected to Local Database.');

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS or_management_summary (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hospital_code VARCHAR(20) NOT NULL,
      hospital_name VARCHAR(100) NOT NULL,
      room_available_str VARCHAR(20),
      operating_count INT DEFAULT 0,
      waiting_count INT DEFAULT 0,
      completed_count INT DEFAULT 0,
      cancelled_count INT DEFAULT 0,
      total_case_today INT DEFAULT 0,
      last_sync_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_hospital (hospital_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await connection.query(createTableQuery);
    console.log('Table or_management_summary created or already exists.');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
