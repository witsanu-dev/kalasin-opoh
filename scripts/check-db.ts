import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkUsers() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.LOCAL_DB_HOST,
      user: process.env.LOCAL_DB_USER,
      password: process.env.LOCAL_DB_PASSWORD,
      database: process.env.LOCAL_DB_NAME,
      port: process.env.LOCAL_DB_PORT ? parseInt(process.env.LOCAL_DB_PORT) : 3306
    });
    
    const [tables]: any = await conn.query("SHOW TABLES LIKE 'users'");
    console.log('Tables:', tables);
    
    if (tables.length > 0) {
      const [columns]: any = await conn.query("DESCRIBE users");
      console.log('Columns:', columns);
      
      const [users]: any = await conn.query("SELECT * FROM users LIMIT 5");
      console.log('Sample data:', users);
    } else {
      console.log('Table users does not exist');
    }
    
    await conn.end();
  } catch (e) {
    console.error('Error:', e);
  }
}

checkUsers();
