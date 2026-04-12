import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on('error', (err) => {
  console.error('[Database] Unexpected error:', err);
});

// Verifica conexión al iniciar
pool.connect()
  .then((client) => {
    console.log('✅ PostgreSQL conectado');
    client.release();
  })
  .catch((err) => {
    console.error('❌ Error conectando a PostgreSQL:', err.message);
  });

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export default pool;