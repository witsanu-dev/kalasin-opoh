const mysql = require('mysql2/promise');

async function setupDatabase() {
  try {
    console.log('Connecting to local MySQL (without database selected)...');
    const connection = await mysql.createConnection({
      host: process.env.LOCAL_DB_HOST || '127.0.0.1',
      port: process.env.LOCAL_DB_PORT || 3306,
      user: process.env.LOCAL_DB_USER || 'root',
      password: process.env.LOCAL_DB_PASSWORD || 'password',
    });

    console.log('Creating database db_opoh if not exists...');
    await connection.query('CREATE DATABASE IF NOT EXISTS db_opoh CHARACTER SET utf8 COLLATE utf8_general_ci;');

    await connection.query('USE db_opoh;');

    console.log('Creating table bed_management_summary if not exists...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS bed_management_summary (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ward_code VARCHAR(255) NOT NULL,
        ward_name VARCHAR(255) NOT NULL,
        total_bed INT DEFAULT 0,
        occupied_bed INT DEFAULT 0,
        available_bed INT DEFAULT 0,
        occupancy_rate DECIMAL(5,2) DEFAULT 0.00,
        export_code VARCHAR(255) DEFAULT NULL,
        last_sync_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_ward (ward_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
    `;
    await connection.query(createTableQuery);

    console.log('Database and tables setup completed successfully.');
    await connection.end();
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

setupDatabase();
