import dotenv from 'dotenv';
import path from 'path';

// Muat variabel lingkungan dari .env jika ada
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'fyj_channel_remote_jwt_secret_key_2026_super_secure',
  // Kunci enkripsi 32-karakter untuk AES-256-CBC
  cypherKey: process.env.CYPHER_KEY || '12345678901234567890123456789012',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  guacd: {
    host: process.env.GUACD_HOST || '127.0.0.1',
    port: parseInt(process.env.GUACD_PORT || '4822', 10),
  },
  wol: {
    defaultBroadcastIp: process.env.DEFAULT_BROADCAST_IP || '255.255.255.255',
    port: parseInt(process.env.WOL_PORT || '9', 10),
  },
  heartbeatIntervalMs: parseInt(process.env.HEARTBEAT_INTERVAL_MS || '8000', 10),
};
