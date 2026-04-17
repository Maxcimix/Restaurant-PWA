import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../utils/db';

const router = Router();

/**
 * GET /api/dev/seed
 * ⚠️  Solo para desarrollo — crea roles y usuarios de prueba
 * Elimina esta ruta antes de ir a producción
 */
router.get('/seed', async (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'No disponible en producción' });
  }

  try {
    // 1. Crear roles
    await pool.query(`
      INSERT INTO roles (name, description) VALUES
        ('admin',   'Administrador con acceso total'),
        ('caja',    'Cajero: valida y cierra pedidos'),
        ('cocina',  'Cocinero: KDS y preparación'),
        ('mesero',  'Mesero: mesas y órdenes'),
        ('cliente', 'Cliente del restaurante')
      ON CONFLICT (name) DO NOTHING
    `);

    // 2. Crear usuarios con hash de contraseña
    const users = [
      { email: 'admin@restaurant.com',  password: 'admin1234',  first: 'Super',  last: 'Admin',  role: 'admin'  },
      { email: 'caja@restaurant.com',   password: 'caja1234',   first: 'Ana',    last: 'García', role: 'caja'   },
      { email: 'cocina@restaurant.com', password: 'cocina1234', first: 'Pedro',  last: 'López',  role: 'cocina' },
      { email: 'mesero@restaurant.com', password: 'mesero1234', first: 'Carlos', last: 'Ruiz',   role: 'mesero' },
    ];

    const created = [];

    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);

      await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role_id)
        VALUES ($1, $2, $3, $4, (SELECT id FROM roles WHERE name = $5))
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
      `, [u.email, hash, u.first, u.last, u.role]);

      created.push({ email: u.email, password: u.password, role: u.role });
    }

    // 3. Crear mesas de ejemplo
    await pool.query(`
      INSERT INTO tables (number, capacity, section, status) VALUES
        (1, 4, 'Salón principal', 'available'),
        (2, 4, 'Salón principal', 'available'),
        (3, 6, 'Salón principal', 'available'),
        (4, 2, 'Terraza',        'available'),
        (5, 4, 'Terraza',        'available'),
        (6, 8, 'Privado',        'available')
      ON CONFLICT (number) DO NOTHING
    `);

    // 4. Crear categorías de menú
    await pool.query(`
      INSERT INTO menu_categories (name, description, position, is_active) VALUES
        ('Entradas',    'Para empezar con buen pie',        1, true),
        ('Principales', 'Platos fuertes del chef',          2, true),
        ('Bebidas',     'Refrescantes opciones',            3, true),
        ('Postres',     'El toque dulce final',             4, true)
      ON CONFLICT DO NOTHING
    `);

    return res.json({
      message: '✅ Seeds creados correctamente',
      usuarios: created,
      nota: '⚠️  Elimina la ruta /api/dev/seed antes de ir a producción',
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[seed]', msg);
    return res.status(500).json({ message: msg });
  }
});

export default router;