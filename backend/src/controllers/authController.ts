import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../utils/db';            // ← default import, como tu db.ts exporta
import { generateToken } from '../utils/jwt';

// ─── POST /api/auth/login ────────────────────────────────────────────────────
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña requeridos' });
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name,
              r.name AS role, u.is_active
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Usuario inactivo. Contacta al administrador.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    const token = generateToken({
      id:    user.id,
      email: user.email,
      role:  user.role,
    });

    return res.json({
      token,
      user: {
        id:    user.id,
        name:  `${user.first_name} ${user.last_name}`,
        email: user.email,
        role:  user.role,
      },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
export async function me(req: Request, res: Response) {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1 AND u.is_active = true`,
      [userId]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.json({
      id:    user.id,
      name:  `${user.first_name} ${user.last_name}`,
      email: user.email,
      role:  user.role,
    });
  } catch (err) {
    console.error('[auth/me]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

// ─── POST /api/auth/register  (solo admin) ──────────────────────────────────
export async function register(req: Request, res: Response) {
  try {
    const { email, password, first_name, last_name, role_name, phone } = req.body;

    if (!email || !password || !first_name || !last_name || !role_name) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    const roleResult = await pool.query(
      'SELECT id FROM roles WHERE name = $1',
      [role_name]
    );
    if (!roleResult.rows[0]) {
      return res.status(400).json({ message: `Rol '${role_name}' no existe` });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (existing.rows[0]) {
      return res.status(409).json({ message: 'El email ya está registrado' });
    }

    const hash = await bcrypt.hash(password, 10);

    const inserted = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role_id, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name`,
      [
        email.toLowerCase().trim(),
        hash,
        first_name.trim(),
        last_name.trim(),
        roleResult.rows[0].id,
        phone ?? null,
      ]
    );

    const newUser = inserted.rows[0];
    return res.status(201).json({
      message: 'Usuario creado correctamente',
      user: {
        id:    newUser.id,
        email: newUser.email,
        name:  `${newUser.first_name} ${newUser.last_name}`,
        role:  role_name,
      },
    });
  } catch (err) {
    console.error('[auth/register]', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}