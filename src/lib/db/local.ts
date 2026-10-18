import mysql from 'mysql2/promise';
import { resolveDbHost } from './host-resolver';

class DatabaseWrapper {
  private pool: mysql.Pool;

  constructor(config: mysql.PoolOptions) {
    this.pool = mysql.createPool(config);
  }

  // Expose commonly used pool methods
  async query(...args: any[]) {
    // @ts-ignore
    return this.pool.query(...args);
  }

  async execute(...args: any[]) {
    // @ts-ignore
    return this.pool.execute(...args);
  }
  
  async getConnection() {
    return this.pool.getConnection();
  }

  // Update configuration dynamically at runtime
  async updateConfig(newConfig: mysql.PoolOptions) {
    const oldPool = this.pool;
    
    // Resolve host dynamically (e.g. 127.0.0.1 -> host.docker.internal when inside Docker)
    const effectiveHost = resolveDbHost(newConfig.host);

    // Create new pool
    this.pool = mysql.createPool({
      ...newConfig,
      host: effectiveHost,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Gracefully close old pool in the background
    try {
      oldPool.end();
    } catch (err) {
      console.error('Error closing old Local pool:', err);
    }
  }
}

// Create initial config from process.env with dynamic host resolution
const initialConfig = {
  host: resolveDbHost(process.env.LOCAL_DB_HOST || '127.0.0.1'),
  port: Number(process.env.LOCAL_DB_PORT) || 3306,
  user: process.env.LOCAL_DB_USER || 'root',
  password: process.env.LOCAL_DB_PASSWORD || 'password',
  database: process.env.LOCAL_DB_NAME || 'db_opoh',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const localDb = new DatabaseWrapper(initialConfig);

export default localDb;
