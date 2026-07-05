import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.HOSXP_DB_HOST,
      port: Number(process.env.HOSXP_DB_PORT),
      user: process.env.HOSXP_DB_USER,
      password: process.env.HOSXP_DB_PASSWORD,
      database: process.env.HOSXP_DB_NAME,
    });

    const [rows1] = await conn.query("SHOW TABLES LIKE '%labor%'");
    console.log("Labor tables:", rows1);

    const [rows2] = await conn.query("DESCRIBE labor_status");
    console.log("labor_status cols:", rows2);

    const [rows3] = await conn.query("SHOW TABLES LIKE '%labour%'");
    console.log("Labour tables:", rows3);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
