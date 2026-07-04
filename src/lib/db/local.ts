import mysql from 'mysql2/promise';

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

export default pool;
