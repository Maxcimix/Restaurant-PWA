/**
 * Ejecuta este script para generar los hashes de las contraseñas de prueba.
 * 
 * Uso:
 *   cd backend
 *   npx ts-node scripts/generate-seeds.ts
 *
 * O con Node directamente (compilado):
 *   node scripts/generate-seeds.js
 *
 * También puedes ejecutarlo dentro del contenedor Docker:
 *   docker exec -it restaurant_backend npx ts-node /app/scripts/generate-seeds.ts
 */

import bcrypt from 'bcryptjs';
import pool  from '../src/utils/db';

const USERS = [
  { email: 'admin@restaurant.com',  password: 'admin1234',  first: 'Super',  last: 'Admin',  role: 'admin'  },
  { email: 'caja@restaurant.com',   password: 'caja1234',   first: 'Ana',    last: 'García', role: 'caja'   },
  { email: 'cocina@restaurant.com', password: 'cocina1234', first: 'Pedro',  last: 'López',  role: 'cocina' },
  { email: 'mesero@restaurant.com', password: 'mesero1234', first: 'Carlos', last: 'Ruiz',   role: 'mesero' },
];

async function run() {
  console.log('🌱 Generando usuarios de prueba...\n');

  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 10);

    await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role_id)
       VALUES ($1, $2, $3, $4, (SELECT id FROM roles WHERE name = $5))
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [u.email, hash, u.first, u.last, u.role]
    );

    console.log(`✅ ${u.role.padEnd(8)} → ${u.email}  (pass: ${u.password})`);
  }

  console.log('\n✅ Seeds completados.');
  await pool.end();
}

run().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});