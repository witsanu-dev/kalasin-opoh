import mysql from 'mysql2/promise';

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
    
    // Create new pool
    this.pool = mysql.createPool({
      ...newConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Gracefully close old pool in the background
    try {
      oldPool.end();
    } catch (err) {
      console.error('Error closing old HOSxP pool:', err);
    }
  }
}

// Create initial config from process.env
const initialConfig = {
  host: process.env.HOSXP_DB_HOST || '192.168.1.100',
  port: Number(process.env.HOSXP_DB_PORT) || 3306,
  user: process.env.HOSXP_DB_USER || 'select',
  password: process.env.HOSXP_DB_PASSWORD || 'select',
  database: process.env.HOSXP_DB_NAME || 'hosxp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const hosxpDb = new DatabaseWrapper(initialConfig);

export default hosxpDb;
