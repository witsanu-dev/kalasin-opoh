import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.HOSXP_DB_HOST || '10.250.100.200',
  port: Number(process.env.HOSXP_DB_PORT) || 3306,
  user: process.env.HOSXP_DB_USER || 'select',
  password: process.env.HOSXP_DB_PASSWORD || 'select@11078',
  database: process.env.HOSXP_DB_NAME || 'hosxp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
