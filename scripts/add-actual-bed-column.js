const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function addActualBedColumn() {
  try {
    console.log('Connecting to local MySQL db_opoh...');
    const connection = await mysql.createConnection({
      host: process.env.LOCAL_DB_HOST || '127.0.0.1',
      port: process.env.LOCAL_DB_PORT || 3306,
      user: process.env.LOCAL_DB_USER || 'root',
      password: process.env.LOCAL_DB_PASSWORD || 'password',
      database: process.env.LOCAL_DB_NAME || 'db_opoh'
    });

    console.log('Adding actual_bed column to bed_management_summary if not exists...');
    const query = `
      ALTER TABLE bed_management_summary 
      ADD COLUMN actual_bed INT DEFAULT NULL AFTER total_bed;
    `;
    try {
      await connection.query(query);
      console.log('Column actual_bed added successfully.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('Column actual_bed already exists, skipping.');
      } else {
        throw e;
      }
    }
    await connection.end();
  } catch (error) {
    console.error('Error modifying database:', error);
  }
}

addActualBedColumn();
